'use client';
import { useEffect, useState } from 'react';
import { Copy, Users, ArrowRight, Check, Radio, ArrowLeft } from 'lucide-react';
import type { GameController } from '../hooks/use-game';
import { api } from '../hooks/use-game';
import { campaigns } from '../../packages/content/src';
import { CharacterCreator } from './character-creator';
export function Multiplayer({ controller: c }: { controller: GameController }) {
  const [code, setCode] = useState(''),
    [capacity, setCapacity] = useState(2),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<{ code: string; campaignId: string; started: boolean }[]>(
    [],
  );
  useEffect(() => {
    if (c.user)
      api<{ rooms: typeof recent }>('/rooms')
        .then((data) => setRecent(data.rooms))
        .catch(() => {});
  }, [c.user]);
  const room = c.room,
    myMember = room?.members.find((m) => m.userId === c.user?.id);
  if (room && creating)
    return (
      <CharacterCreator
        online
        initial={myMember?.selection ?? undefined}
        onBack={() => setCreating(false)}
        onSubmit={async (selection) => {
          await c.selectInRoom(selection);
          setCreating(false);
        }}
      />
    );
  return (
    <div className="multiplayer-page page-enter">
      <button className="text-button" onClick={c.leave}>
        <ArrowLeft size={16} />
        Till lägerelden
      </button>
      <p className="eyebrow">BERÄTTELSER BLIR STÖRRE TILLSAMMANS</p>
      <h1>{room ? 'Samla ditt sällskap.' : 'Ingen måste vandra ensam.'}</h1>
      <p className="page-description">
        Två till fyra hjältar. En gemensam värld. Varje val och varje strid delas i realtid.
      </p>
      {room ? (
        <div className="lobby panel">
          <div className="lobby-top">
            <div>
              <p className="eyebrow">BJUD IN MED RUMSKODEN</p>
              <h2 className="room-code">{room.code}</h2>
            </div>
            <button
              className="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(room.code)
                  .then(() => c.setNotice('Rumskoden är kopierad.'))
                  .catch(() => c.setNotice(`Rumskod: ${room.code}`))
              }
            >
              <Copy size={16} />
              Kopiera
            </button>
          </div>
          <p>
            {campaigns[room.campaignId].title} · {room.members.length}/{room.capacity} spelare
          </p>
          <div className="lobby-members">
            {Array.from({ length: room.capacity }, (_, i) => {
              const member = room.members[i];
              return (
                <div key={i} className={member ? 'joined' : ''}>
                  <div className="avatar">
                    <Users size={20} />
                  </div>
                  <div>
                    <strong>
                      {member?.selection?.name ??
                        (member ? 'Väljer rollperson…' : 'Väntar på äventyrare')}
                    </strong>
                    <small>
                      {member?.selection
                        ? `${member.selection.class} · ${member.userId === room.hostId ? 'Värd' : 'Sällskap'}`
                        : 'Dela rumskoden för att bjuda in'}
                    </small>
                  </div>
                  {member?.selection && <Check className="green" size={20} />}
                  <span className={`status-dot ${member?.connected ? 'live' : ''}`} />
                </div>
              );
            })}
          </div>
          <button className="button" onClick={() => setCreating(true)}>
            {myMember?.selection ? 'Ändra rollperson' : 'Skapa din rollperson'}
            <ArrowRight size={16} />
          </button>
          {room.hostId === c.user?.id && (
            <button
              className="button primary"
              disabled={
                room.members.length < 2 ||
                room.members.some((m) => !m.selection) ||
                c.connection !== 'online'
              }
              onClick={c.startRoom}
            >
              Starta äventyret
              <ArrowRight size={16} />
            </button>
          )}
          <p className="muted">
            <Radio size={13} />{' '}
            {c.connection === 'online' ? 'Ansluten till sällskapet' : 'Ansluter…'} · Rummet sparas
            automatiskt.
          </p>
        </div>
      ) : (
        <>
          <div className="multiplayer-options">
            <section className="panel">
              <Users size={30} />
              <h2>Bilda ett sällskap</h2>
              <label className="field-label" htmlFor="room-campaign">
                Kampanj
              </label>
              <select
                id="room-campaign"
                value={c.campaignId}
                onChange={(e) => c.setCampaignId(e.target.value)}
              >
                {Object.values(campaigns).map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.title}
                  </option>
                ))}
              </select>
              <label className="field-label" htmlFor="room-size">
                Antal platser
              </label>
              <select
                id="room-size"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              >
                <option value={2}>2 hjältar</option>
                <option value={3}>3 hjältar</option>
                <option value={4}>4 hjältar</option>
              </select>
              <button
                className="button primary full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await c.createRoom(capacity);
                  setBusy(false);
                }}
              >
                Skapa rum
                <ArrowRight size={17} />
              </button>
            </section>
            <section className="panel">
              <Radio size={30} />
              <h2>Anslut till vänner</h2>
              <p className="muted">
                Har du fått en inbjudan? Skriv den sex tecken långa rumskoden.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  await c.joinRoom(code);
                  setBusy(false);
                }}
              >
                <label className="field-label" htmlFor="room-code">
                  Rumskod
                </label>
                <input
                  id="room-code"
                  maxLength={6}
                  value={code}
                  placeholder="A1B2C3"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
                <button className="button full" disabled={code.length !== 6 || busy}>
                  Gå med i sällskapet
                  <ArrowRight size={17} />
                </button>
              </form>
            </section>
          </div>
          {recent.length > 0 && (
            <section className="recent-rooms">
              <h2>Dina tidigare sällskap</h2>
              {recent.map((room) => (
                <button
                  className="button full"
                  key={room.code}
                  onClick={() => c.joinRoom(room.code)}
                >
                  <span>
                    {room.code} · {campaigns[room.campaignId]?.title}
                  </span>
                  <span>
                    {room.started ? 'Återanslut' : 'Till lobbyn'}
                    <ArrowRight size={15} />
                  </span>
                </button>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
