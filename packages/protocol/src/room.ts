import type { CharacterSelection, GameState } from '../../engine/src/types';
export interface PublicUser {
  id: string;
  email: string | null;
}
export interface RoomMember {
  userId: string;
  selection: CharacterSelection | null;
  connected: boolean;
}
export interface Room {
  id: string;
  code: string;
  hostId: string;
  campaignId: string;
  capacity: number;
  members: RoomMember[];
  game: GameState | null;
  revision: number;
}
export type ServerMessage =
  { type: 'snapshot'; room: Room } | { type: 'error'; error: string } | { type: 'ack'; id: string };
