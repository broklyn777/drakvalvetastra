'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { campaigns, getCampaign } from '../../packages/content/src';
import { createCharacter } from '../../packages/engine/src/characters';
import { currentActor } from '../../packages/engine/src/combat';
import { createGame, dispatch } from '../../packages/engine/src/engine';
import { createTestGame, type TestStart } from '../../packages/engine/src/testing';
import type {
  Character,
  CharacterSelection,
  GameCommand,
  GameState,
} from '../../packages/engine/src/types';
import type { PublicUser, Room, ServerMessage } from '../../packages/protocol/src/room';
import { BrowserSaveRepository, parseSave } from '../../packages/persistence/src/saves';
import { makeSave } from '../../packages/protocol/src/schema';
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Förfrågan misslyckades.');
  return data as T;
}
export type Screen = 'home' | 'creation' | 'game' | 'multiplayer' | 'characters';
export function useGame() {
  const [screen, setScreen] = useState<Screen>('home');
  const [game, setGame] = useState<GameState | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [campaignId, setCampaignId] = useState('watchtower');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [auto, setAuto] = useState<GameState | null>(null);
  const [roster, setRoster] = useState<Character[]>([]);
  const [connection, setConnection] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [pending, setPending] = useState(false);
  /** Local party: the hero the player acts as outside combat. */
  const [focus, setFocus] = useState('');
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const socket = useRef<WebSocket | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const pendingRef = useRef(false);
  const roomCode = room?.code;
  const report = useCallback(
    (e: unknown) => setError(e instanceof Error ? e.message : 'Något gick fel.'),
    [],
  );
  useEffect(() => {
    try {
      setAuto(new BrowserSaveRepository(localStorage).read('auto')?.state ?? null);
      const raw = localStorage.getItem('drakvalvet:roster');
      if (raw) {
        const snapshots = JSON.parse(raw) as unknown[];
        setRoster(snapshots.map((raw) => parseSave(raw).state.players[0]));
      }
    } catch {
      setError('En lokal sparning kunde inte läsas. Importera en säkerhetskopia via Sparningar.');
    }
    setReady(true);
    api<{ user: PublicUser | null }>('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!game || room) return;
    try {
      const save = makeSave(game, `${game.players[0].name} · ${campaigns[game.campaignId].title}`);
      new BrowserSaveRepository(localStorage).write('auto', game, save.label);
      setAuto(game);
      const stored = JSON.parse(localStorage.getItem('drakvalvet:roster') ?? '[]') as unknown[];
      const snapshots = stored.map((raw) => parseSave(raw));
      const updated = [
        save,
        ...snapshots.filter((s) => s.state.players[0].id !== game.players[0].id),
      ].slice(0, 20);
      localStorage.setItem('drakvalvet:roster', JSON.stringify(updated));
      setRoster(updated.map((s) => s.state.players[0]));
    } catch {
      setError('Autosparningen misslyckades. Exportera en sparfil innan du stänger.');
    }
  }, [game, room]);
  useEffect(() => {
    if (!roomCode) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const connect = () => {
      setConnection('connecting');
      const base =
        process.env.NEXT_PUBLIC_WS_URL ??
        (process.env.NODE_ENV === 'production'
          ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:4001/socket`
          : `ws://${location.hostname}:4001/socket`);
      const ws = new WebSocket(`${base}?room=${roomCode}`);
      socket.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setConnection('online');
      };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          if (message.type === 'snapshot') {
            setRoom(message.room);
            if (message.room.game) {
              setGame(message.room.game);
              setScreen('game');
            }
          }
          if (message.type === 'error') {
            setError(message.error);
            pendingRef.current = false;
            setPending(false);
          }
          if (message.type === 'ack') {
            pendingRef.current = false;
            setPending(false);
          }
        } catch {
          setError('Ett meddelande från servern kunde inte läsas.');
        }
      };
      ws.onclose = () => {
        pendingRef.current = false;
        setPending(false);
        if (stopped) return;
        setConnection('offline');
        timer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 15000));
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.current?.close();
      socket.current = null;
      setConnection('offline');
    };
  }, [roomCode]);
  const ensureUser = async () => {
    if (user) return user;
    const data = await api<{ user: PublicUser }>('/auth/guest', 'POST', {});
    setUser(data.user);
    return data.user;
  };
  /** A local party of 1–4 heroes played from this screen. */
  const startParty = (selections: CharacterSelection[]) => {
    setRoom(null);
    setFocus('');
    setGame(
      createGame(
        getCampaign(campaignId),
        selections.map((selection) => createCharacter(selection, crypto.randomUUID())),
        crypto.getRandomValues(new Uint32Array(1))[0],
        crypto.randomUUID(),
      ),
    );
    setScreen('game');
    setError('');
  };
  const start = (selection: CharacterSelection) => {
    const id = crypto.randomUUID();
    setRoom(null);
    setFocus('');
    setGame(
      createGame(
        getCampaign(campaignId),
        [createCharacter(selection, id)],
        crypto.getRandomValues(new Uint32Array(1))[0],
        crypto.randomUUID(),
      ),
    );
    setScreen('game');
    setError('');
  };
  /** Preview/local test mode: start directly in a chosen scene. */
  const startTest = (test: TestStart) => {
    setRoom(null);
    setFocus('');
    setCampaignId(test.campaignId);
    setGame(
      createTestGame(getCampaign(test.campaignId), test, crypto.randomUUID(), crypto.randomUUID()),
    );
    setScreen('game');
    setError('');
    setNotice(`Testläge: startar i ${test.scene} med seed ${test.seed}.`);
  };
  const load = (state: GameState) => {
    setRoom(null);
    setFocus('');
    setGame(state);
    setCampaignId(state.campaignId);
    setScreen('game');
    setError('');
    setNotice('Sparningen är laddad.');
  };
  const act = (command: GameCommand) => {
    const current = gameRef.current;
    if (!current) return;
    setError('');
    if (room) {
      if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
        setError('Vänta på återanslutningen.');
        return;
      }
      if (pendingRef.current) return;
      pendingRef.current = true;
      setPending(true);
      socket.current.send(
        JSON.stringify({ id: crypto.randomUUID(), revision: current.revision, command }),
      );
    } else {
      const focused = current.players.find((p) => p.id === focusRef.current && p.hp > 0);
      const actor =
        (current.combat && !current.combat.victory ? currentActor(current)?.id : undefined) ??
        focused?.id ??
        current.players.find((p) => p.hp > 0)?.id ??
        current.players[0].id;
      const result = dispatch(current, getCampaign(current.campaignId), actor, command);
      if (result.ok) {
        gameRef.current = result.state;
        setGame(result.state);
      } else setError(result.error);
    }
  };
  const createRoom = async (capacity: number) => {
    try {
      await ensureUser();
      const data = await api<{ room: Room }>('/rooms', 'POST', { campaignId, capacity });
      setRoom(data.room);
      setScreen('multiplayer');
    } catch (e) {
      report(e);
    }
  };
  const joinRoom = async (code: string) => {
    try {
      await ensureUser();
      const data = await api<{ room: Room }>(
        `/rooms/${code.trim().toUpperCase()}/join`,
        'POST',
        {},
      );
      setRoom(data.room);
      setScreen('multiplayer');
    } catch (e) {
      report(e);
    }
  };
  const selectInRoom = async (selection: CharacterSelection) => {
    if (!room) return;
    try {
      const data = await api<{ room: Room }>(`/rooms/${room.code}/character`, 'POST', selection);
      setRoom(data.room);
    } catch (e) {
      report(e);
    }
  };
  const startRoom = async () => {
    if (!room) return;
    try {
      const data = await api<{ room: Room }>(`/rooms/${room.code}/start`, 'POST', {});
      setRoom(data.room);
      if (data.room.game) {
        setGame(data.room.game);
        setScreen('game');
      }
    } catch (e) {
      report(e);
    }
  };
  const leave = () => {
    setRoom(null);
    setGame(null);
    setScreen('home');
  };
  return {
    screen,
    setScreen,
    game,
    room,
    user,
    setUser,
    campaignId,
    setCampaignId,
    error,
    setError,
    notice,
    setNotice,
    ready,
    auto,
    roster,
    connection,
    pending,
    report,
    start,
    startParty,
    focus,
    setFocus,
    startTest,
    load,
    act,
    createRoom,
    joinRoom,
    selectInRoom,
    startRoom,
    leave,
  };
}
export type GameController = ReturnType<typeof useGame>;
