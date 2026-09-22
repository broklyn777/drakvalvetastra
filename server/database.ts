import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Room } from '../packages/protocol/src/room';
export class Database {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE,password_hash TEXT,created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,host_id TEXT NOT NULL REFERENCES users(id),revision INTEGER NOT NULL,payload TEXT NOT NULL,updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (room_id TEXT NOT NULL REFERENCES rooms(id),command_id TEXT NOT NULL,actor_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(room_id,command_id));
      CREATE TABLE IF NOT EXISTS saves (user_id TEXT NOT NULL REFERENCES users(id),slot TEXT NOT NULL,payload TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,slot));
      CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL,updated_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);`);
  }
  room(code: string): Room | null {
    const row = this.db.prepare('SELECT payload FROM rooms WHERE code=?').get(code) as
      { payload: string } | undefined;
    return row ? JSON.parse(row.payload) : null;
  }
  createRoom(room: Room) {
    this.db
      .prepare('INSERT INTO rooms VALUES (?,?,?,?,?,?)')
      .run(room.id, room.code, room.hostId, room.revision, JSON.stringify(room), Date.now());
  }
  /** Snapshot, command receipt and character progression commit atomically with optimistic locking. */
  updateRoom(
    room: Room,
    expected: number,
    receipt?: { id: string; actor: string; payload: string },
  ) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db
        .prepare('UPDATE rooms SET payload=?,revision=?,updated_at=? WHERE id=? AND revision=?')
        .run(JSON.stringify(room), room.revision, Date.now(), room.id, expected);
      if (!result.changes) throw new Error('Rummet ändrades samtidigt. Försök igen.');
      if (receipt)
        this.db
          .prepare('INSERT INTO commands VALUES (?,?,?,?,?)')
          .run(room.id, receipt.id, receipt.actor, room.revision, receipt.payload);
      for (const p of room.game?.players ?? [])
        this.db
          .prepare(
            'INSERT INTO characters VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',
          )
          .run(`${room.id}:${p.id}`, p.id, JSON.stringify(p), Date.now());
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  close() {
    this.db.close();
  }
}
