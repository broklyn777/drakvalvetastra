import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { Database } from '../server/database';
import { RoomService } from '../server/rooms';
import { createGuest, passwordHash, passwordMatches } from '../server/auth';
import type { CharacterSelection } from '../packages/engine/src/types';
let db: Database, service: RoomService, host: string, guest: string;
const selection: CharacterSelection = { name: 'Mira', race: 'elf', class: 'mage', talent: 'keen' };
beforeEach(() => {
  db = new Database(':memory:');
  service = new RoomService(db);
  host = createGuest(db).id;
  guest = createGuest(db).id;
});
afterEach(() => db.close());
function room() {
  const room = service.create(host, 'watchtower', 2);
  service.join(room.code, guest);
  service.select(room.code, host, selection);
  service.select(room.code, guest, { ...selection, name: 'Runa' });
  return service.start(room.code, host);
}
describe('authoritative room boundary', () => {
  it('enforces capacity, ownership and host-only start', () => {
    const created = service.create(host, 'watchtower', 2);
    expect(() => service.get(created.code, guest)).toThrow();
    service.join(created.code, guest);
    expect(() => service.join(created.code, createGuest(db).id)).toThrow();
    expect(() => service.start(created.code, guest)).toThrow();
    expect(() => service.start(created.code, host)).toThrow();
  });
  it('persists commands, deduplicates retries and rejects stale revisions', () => {
    const r = room(),
      envelope = { id: 'cmd-1', revision: 0, command: { type: 'choose' as const, next: 'inn' } };
    const one = service.command(r.code, host, envelope),
      two = service.command(r.code, host, envelope);
    expect(one.game).toEqual(two.game);
    expect(two.game!.revision).toBe(1);
    expect(() => service.command(r.code, guest, { ...envelope, id: 'stale' })).toThrow(/ändrats/);
    expect(() => service.command(r.code, guest, envelope)).toThrow(/ID/);
    expect(db.db.prepare('SELECT COUNT(*) AS n FROM commands').get()).toMatchObject({ n: 1 });
  });
  it('cannot impersonate a player or choose an unavailable outcome', () => {
    const r = room();
    expect(() =>
      service.command(r.code, createGuest(db).id, {
        id: 'evil',
        revision: 0,
        command: { type: 'choose', next: 'inn' },
      }),
    ).toThrow();
    expect(() =>
      service.command(r.code, host, {
        id: 'skip',
        revision: 0,
        command: { type: 'choose', next: 'ending' },
      }),
    ).toThrow();
    expect(service.get(r.code, host).game!.revision).toBe(0);
  });
  it('restores rooms and persistent characters from the repository', () => {
    const r = room();
    const newService = new RoomService(db);
    expect(newService.get(r.code, host).game).toEqual(r.game);
    expect(db.db.prepare('SELECT COUNT(*) AS n FROM characters').get()).toMatchObject({ n: 2 });
  });
  it('detects optimistic-lock conflicts without partially persisting', () => {
    const r = room();
    const old = structuredClone(r);
    r.revision++;
    db.updateRoom(r, old.revision);
    old.revision++;
    expect(() =>
      db.updateRoom(old, old.revision - 1, { id: 'nope', actor: host, payload: '{}' }),
    ).toThrow();
    expect(db.db.prepare('SELECT COUNT(*) AS n FROM commands').get()).toMatchObject({ n: 0 });
  });
});
it('hashes passwords with unique salts and constant-time key verification', async () => {
  const a = await passwordHash('correct horse battery'),
    b = await passwordHash('correct horse battery');
  expect(a).not.toBe(b);
  expect(await passwordMatches('correct horse battery', a)).toBe(true);
  expect(await passwordMatches('incorrect', a)).toBe(false);
});
