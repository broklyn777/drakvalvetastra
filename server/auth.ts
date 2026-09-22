import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { IncomingMessage } from 'node:http';
import type { Database } from './database';
import type { PublicUser } from '../packages/protocol/src/room';
const scrypt = promisify(scryptCallback);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function userFromRequest(db: Database, req: IncomingMessage): PublicUser | null {
  const token = req.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('dv_session='))
    ?.slice(11);
  if (!token) return null;
  return (
    (db.db
      .prepare(
        'SELECT users.id,users.email FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?',
      )
      .get(hash(token), Date.now()) as unknown as PublicUser) ?? null
  );
}
export function createSession(db: Database, userId: string) {
  const token = randomBytes(32).toString('hex');
  db.db
    .prepare('INSERT INTO sessions VALUES (?,?,?)')
    .run(hash(token), userId, Date.now() + 30 * 86400000);
  return `dv_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
}
export function createGuest(db: Database): PublicUser {
  const user = { id: randomUUID(), email: null };
  db.db.prepare('INSERT INTO users VALUES (?,NULL,NULL,?)').run(user.id, Date.now());
  return user;
}
export function logout(db: Database, req: IncomingMessage) {
  const token = req.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('dv_session='))
    ?.slice(11);
  if (token) db.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
}
