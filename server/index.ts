import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { Database } from './database';
import {
  createGuest,
  createSession,
  logout,
  passwordHash,
  passwordMatches,
  userFromRequest,
} from './auth';
import { RoomService } from './rooms';
import {
  credentialsSchema,
  envelopeSchema,
  selectionSchema,
} from '../packages/protocol/src/schema';
import { parseSave } from '../packages/persistence/src/saves';
import type { Room, ServerMessage } from '../packages/protocol/src/room';
const db = new Database(process.env.DATABASE_PATH ?? '.data/drakvalvet.sqlite');
const rooms = new RoomService(db);
const port = Number(process.env.GAME_PORT ?? 4001);
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000').split(','),
);
const clients = new Map<WebSocket, { userId: string; code: string; alive: boolean }>();
const limits = new Map<string, { count: number; until: number }>();
function limit(key: string, max: number) {
  const now = Date.now();
  let value = limits.get(key);
  if (!value || value.until < now) {
    value = { count: 0, until: now + 60000 };
    limits.set(key, value);
  }
  if (++value.count > max) throw new Error('För många förfrågningar. Vänta en minut.');
}
function json(res: ServerResponse, value: unknown, status = 200, cookie?: string) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(cookie ? { 'Set-Cookie': cookie } : {}),
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('JSON krävs.');
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 1024 * 1024) throw new Error('För stor förfrågan.');
  }
  return JSON.parse(raw || '{}') as unknown;
}
function snapshot(room: Room) {
  return {
    ...room,
    members: room.members.map((m) => ({
      ...m,
      connected: [...clients.values()].some((c) => c.code === room.code && c.userId === m.userId),
    })),
  };
}
function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}
function broadcast(room: Room) {
  for (const [ws, client] of clients)
    if (client.code === room.code) send(ws, { type: 'snapshot', room: snapshot(room) });
}
const server = createServer(async (req, res) => {
  try {
    if (req.headers.origin && !allowedOrigins.has(req.headers.origin))
      return json(res, { error: 'Otillåtet ursprung.' }, 403);
    const url = new URL(req.url ?? '/', `http://localhost:${port}`),
      path = url.pathname;
    if (path === '/health') return json(res, { ok: true, service: 'drakvalvet-game', protocol: 1 });
    const user = userFromRequest(db, req);
    limit(`http:${user?.id ?? req.socket.remoteAddress}`, 180);
    if (path === '/auth/me' && req.method === 'GET') return json(res, { user });
    if (path === '/auth/guest' && req.method === 'POST') {
      await body(req);
      const guest = user ?? createGuest(db);
      return json(res, { user: guest }, 200, user ? undefined : createSession(db, guest.id));
    }
    if (['/auth/register', '/auth/login'].includes(path) && req.method === 'POST') {
      limit(`auth:${req.socket.remoteAddress}`, 15);
      const data = credentialsSchema.parse(await body(req));
      const existing = db.db
        .prepare('SELECT id,email,password_hash FROM users WHERE email=?')
        .get(data.email) as { id: string; email: string; password_hash: string } | undefined;
      if (path === '/auth/login') {
        // Run scrypt even when the address does not exist to reduce account enumeration via timing.
        const valid = await passwordMatches(
          data.password,
          existing?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
        );
        if (!existing || !valid)
          return json(res, { error: 'Fel e-postadress eller lösenord.' }, 401);
        return json(
          res,
          { user: { id: existing.id, email: existing.email } },
          200,
          createSession(db, existing.id),
        );
      }
      if (existing) throw new Error('Kontot kunde inte skapas med den e-postadressen.');
      const id = user && !user.email ? user.id : randomUUID();
      const password = await passwordHash(data.password);
      if (user && !user.email)
        db.db
          .prepare('UPDATE users SET email=?,password_hash=? WHERE id=?')
          .run(data.email, password, id);
      else
        db.db
          .prepare('INSERT INTO users VALUES (?,?,?,?)')
          .run(id, data.email, password, Date.now());
      return json(res, { user: { id, email: data.email } }, 201, createSession(db, id));
    }
    if (path === '/auth/logout' && req.method === 'POST') {
      await body(req);
      logout(db, req);
      return json(res, { ok: true }, 200, 'dv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    }
    if (!user) return json(res, { error: 'Logga in eller börja som gäst.' }, 401);
    if (path === '/rooms' && req.method === 'POST') {
      const data = z
        .object({ campaignId: z.string().max(100), capacity: z.number().int().min(2).max(4) })
        .strict()
        .parse(await body(req));
      return json(res, { room: rooms.create(user.id, data.campaignId, data.capacity) }, 201);
    }
    if (path === '/rooms' && req.method === 'GET') {
      const all = db.db
        .prepare('SELECT payload FROM rooms ORDER BY updated_at DESC LIMIT 500')
        .all() as { payload: string }[];
      return json(res, {
        rooms: all
          .map((row) => JSON.parse(row.payload) as Room)
          .filter((r) => r.members.some((m) => m.userId === user.id))
          .slice(0, 20)
          .map((r) => ({ code: r.code, campaignId: r.campaignId, started: !!r.game })),
      });
    }
    const match = path.match(/^\/rooms\/([A-F0-9]{6})(?:\/(join|character|start))?$/);
    if (match) {
      const [, code, action] = match;
      if (req.method === 'GET' && !action)
        return json(res, { room: snapshot(rooms.get(code, user.id)) });
      if (req.method === 'POST') {
        const data = await body(req);
        const room =
          action === 'join'
            ? rooms.join(code, user.id)
            : action === 'character'
              ? rooms.select(code, user.id, selectionSchema.parse(data))
              : action === 'start'
                ? rooms.start(code, user.id)
                : null;
        if (!room) return json(res, { error: 'Okänd åtgärd.' }, 404);
        broadcast(room);
        return json(res, { room: snapshot(room) });
      }
    }
    if (path === '/characters' && req.method === 'GET') {
      const rows = db.db
        .prepare(
          'SELECT payload FROM characters WHERE user_id=? ORDER BY updated_at DESC LIMIT 100',
        )
        .all(user.id) as { payload: string }[];
      return json(res, { characters: rows.map((row) => JSON.parse(row.payload)) });
    }
    if (path === '/saves' && req.method === 'GET') {
      const rows = db.db
        .prepare('SELECT slot,payload FROM saves WHERE user_id=? ORDER BY updated_at DESC')
        .all(user.id) as { slot: string; payload: string }[];
      return json(res, {
        saves: rows.map((row) => ({ slot: row.slot, ...JSON.parse(row.payload) })),
      });
    }
    const slot = path.match(/^\/saves\/([1-3])$/)?.[1];
    if (slot && req.method === 'PUT') {
      if (!user.email) throw new Error('Skapa ett konto för kontosparningar.');
      const save = parseSave(await body(req));
      db.db
        .prepare(
          'INSERT INTO saves VALUES (?,?,?,?) ON CONFLICT(user_id,slot) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',
        )
        .run(user.id, slot, JSON.stringify(save), Date.now());
      // Solo saves are untrusted private data. Never imported into authoritative multiplayer rooms.
      return json(res, { ok: true });
    }
    if (slot && req.method === 'GET') {
      const row = db.db
        .prepare('SELECT payload FROM saves WHERE user_id=? AND slot=?')
        .get(user.id, slot) as { payload: string } | undefined;
      return row
        ? json(res, { save: JSON.parse(row.payload) })
        : json(res, { error: 'Sparplatsen är tom.' }, 404);
    }
    json(res, { error: 'Sidan finns inte.' }, 404);
  } catch (error) {
    json(
      res,
      {
        error:
          error instanceof z.ZodError
            ? 'Ogiltiga uppgifter.'
            : error instanceof Error && !/SQLITE|UNIQUE|constraint/i.test(error.message)
              ? error.message
              : 'Förfrågan kunde inte utföras.',
      },
      400,
    );
  }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
server.on('upgrade', (req, socket, head) => {
  try {
    if (!req.headers.origin || !allowedOrigins.has(req.headers.origin)) throw new Error('Origin');
    const user = userFromRequest(db, req);
    if (!user) throw new Error('Auth');
    limit(`upgrade:${user.id}`, 30);
    if ([...clients.values()].filter((c) => c.userId === user.id).length >= 5)
      throw new Error('Connections');
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    if (url.pathname !== '/socket') throw new Error('Path');
    const code = z
      .string()
      .regex(/^[A-F0-9]{6}$/)
      .parse(url.searchParams.get('room'));
    const room = rooms.get(code, user.id);
    wss.handleUpgrade(req, socket, head, (ws) => {
      clients.set(ws, { userId: user.id, code, alive: true });
      broadcast(room);
      ws.on('pong', () => {
        const c = clients.get(ws);
        if (c) c.alive = true;
      });
      ws.on('message', (data) => {
        try {
          if (!userFromRequest(db, req)) {
            ws.close(1008, 'Session expired');
            return;
          }
          limit(`ws:${user.id}`, 120);
          const envelope = envelopeSchema.parse(JSON.parse(data.toString()));
          const updated = rooms.command(code, user.id, envelope);
          broadcast(updated);
          send(ws, { type: 'ack', id: envelope.id });
        } catch (error) {
          send(ws, {
            type: 'error',
            error:
              error instanceof z.ZodError
                ? 'Ogiltigt kommando.'
                : error instanceof Error
                  ? error.message
                  : 'Draget misslyckades.',
          });
          const current = db.room(code);
          if (current) send(ws, { type: 'snapshot', room: snapshot(current) });
        }
      });
      ws.on('close', () => {
        clients.delete(ws);
        const current = db.room(code);
        if (current) broadcast(current);
      });
      ws.on('error', () => ws.close());
    });
  } catch {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
  }
});
const timer = setInterval(() => {
  for (const [ws, client] of clients) {
    if (!client.alive) {
      ws.terminate();
      clients.delete(ws);
    } else {
      client.alive = false;
      ws.ping();
    }
  }
  for (const [key, value] of limits) if (value.until < Date.now()) limits.delete(key);
  db.db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
}, 30000);
server.listen(port, '0.0.0.0', () =>
  console.log(`Drakvalvet game server: http://localhost:${port}`),
);
function shutdown() {
  clearInterval(timer);
  for (const ws of clients.keys()) ws.close(1001, 'Server restart');
  wss.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
