import { randomBytes, randomUUID } from 'node:crypto';
import type { Database } from './database';
import type { CharacterSelection, CommandEnvelope } from '../packages/engine/src/types';
import type { Room } from '../packages/protocol/src/room';
import { getCampaign } from '../packages/content/src';
import { createCharacter } from '../packages/engine/src/characters';
import { createGame, dispatch } from '../packages/engine/src/engine';
export class RoomService {
  constructor(private db: Database) {}
  get(code: string, userId: string) {
    const room = this.db.room(code);
    if (!room || !room.members.some((m) => m.userId === userId))
      throw new Error('Du har inte tillgång till rummet.');
    return room;
  }
  create(userId: string, campaignId: string, capacity: number) {
    getCampaign(campaignId);
    const count = this.db.db
      .prepare('SELECT COUNT(*) AS n FROM rooms WHERE host_id=?')
      .get(userId) as { n: number };
    if (count.n >= 50) throw new Error('Du har nått gränsen på 50 rum.');
    let code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    while (this.db.room(code)) code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    const room: Room = {
      id: randomUUID(),
      code,
      hostId: userId,
      campaignId,
      capacity,
      members: [{ userId, selection: null, connected: false }],
      game: null,
      revision: 0,
    };
    this.db.createRoom(room);
    return room;
  }
  join(code: string, userId: string) {
    const room = this.db.room(code);
    if (!room) throw new Error('Rummet finns inte. Kontrollera koden.');
    if (room.members.some((m) => m.userId === userId)) return room;
    if (room.game || room.members.length >= room.capacity)
      throw new Error('Rummet är fullt eller äventyret har börjat.');
    const previous = room.revision++;
    room.members.push({ userId, selection: null, connected: false });
    this.db.updateRoom(room, previous);
    return room;
  }
  select(code: string, userId: string, selection: CharacterSelection) {
    const room = this.get(code, userId);
    if (room.game) throw new Error('Äventyret har redan börjat.');
    const previous = room.revision++;
    room.members.find((m) => m.userId === userId)!.selection = selection;
    this.db.updateRoom(room, previous);
    return room;
  }
  start(code: string, userId: string) {
    const room = this.get(code, userId);
    if (room.hostId !== userId || room.game)
      throw new Error('Bara värden kan starta ett nytt äventyr.');
    if (room.members.length < 2 || room.members.some((m) => !m.selection))
      throw new Error('Minst två spelare behöver välja rollperson först.');
    const previous = room.revision++;
    room.game = createGame(
      getCampaign(room.campaignId),
      room.members.map((m) => createCharacter(m.selection!, m.userId)),
      randomBytes(4).readUInt32LE(),
      room.id,
    );
    this.db.updateRoom(room, previous);
    return room;
  }
  command(code: string, userId: string, envelope: CommandEnvelope) {
    const room = this.get(code, userId);
    if (!room.game) throw new Error('Äventyret har inte startat.');
    const existing = this.db.db
      .prepare('SELECT actor_id,payload FROM commands WHERE room_id=? AND command_id=?')
      .get(room.id, envelope.id) as { actor_id: string; payload: string } | undefined;
    if (existing) {
      if (existing.actor_id !== userId || existing.payload !== JSON.stringify(envelope))
        throw new Error('Kommandots ID används redan.');
      return room;
    }
    const result = dispatch(
      room.game,
      getCampaign(room.campaignId),
      userId,
      envelope.command,
      envelope.revision,
    );
    if (!result.ok) throw new Error(result.error);
    const previous = room.revision++;
    room.game = result.state;
    this.db.updateRoom(room, previous, {
      id: envelope.id,
      actor: userId,
      payload: JSON.stringify(envelope),
    });
    return room;
  }
}
