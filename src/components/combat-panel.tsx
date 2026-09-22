'use client';
import { useState } from 'react';
import {
  Swords,
  Shield,
  Flame,
  ArrowRight,
  HeartPulse,
  MoveHorizontal,
  ChevronsRight,
  HandHelping,
  ScrollText,
  Skull,
  Trophy,
  Target,
} from 'lucide-react';
import { abilities } from '../../packages/engine/src/characters';
import { canTarget, currentActor } from '../../packages/engine/src/combat';
import type { Character, GameCommand, GameState } from '../../packages/engine/src/types';
export function CombatPanel({
  game,
  hero,
  act,
  disabled,
}: {
  game: GameState;
  hero: Character;
  act: (cmd: GameCommand) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState('');
  const [ally, setAlly] = useState(hero.id);
  const [fullLog, setFullLog] = useState(false);
  const c = game.combat!;
  const active = currentActor(game);
  const yourTurn = !disabled && active?.id === hero.id && !c.victory && game.status === 'active';
  const target =
    c.enemies.find((e) => e.id === selected && canTarget(game, hero, e)) ??
    c.enemies.find((e) => canTarget(game, hero, e));
  const ability = abilities[hero.selection.class];
  const log = game.events.filter(
    (e) =>
      e.id > (game.events.findLast((e) => e.text === 'Striden börjar. Slå initiativ.')?.id ?? 0),
  );
  return (
    <section className="combat-panel" aria-label="Strid">
      <div className="combat-top">
        <span className="eyebrow">
          <Swords size={16} /> TAKTISK STRID
        </span>
        <span className="badge">Runda {c.round}</span>
      </div>
      <div className="initiative" aria-label="Turordning">
        {c.initiative.map((entry) => (
          <div
            key={entry.id}
            className={`${active?.id === entry.id ? 'active' : ''} ${entry.kind === 'enemy' ? 'enemy' : ''}`}
          >
            <span>
              {entry.kind === 'hero' ? <Shield size={13} /> : <Skull size={13} />} {entry.name}
            </span>
            <small>{entry.total}</small>
          </div>
        ))}
      </div>
      {c.victory ? (
        <div className="victory">
          <Trophy size={38} />
          <h2>En seger att minnas.</h2>
          <p>+{Math.floor(c.reward / game.players.length)} erfarenhet per hjälte</p>
          <div className="battle-stats">
            {game.players.map((p) => (
              <p key={p.id}>
                <strong>{p.name}</strong>
                <span>
                  {c.stats[p.id].damage} skada · {c.stats[p.id].taken} mottagen ·{' '}
                  {c.stats[p.id].healing} läkt
                </span>
              </p>
            ))}
          </div>
          <button
            className="button primary"
            disabled={disabled}
            onClick={() => act({ type: 'continue' })}
          >
            Fortsätt äventyret
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          <div className="enemies">
            {c.enemies.map((e) => {
              const reachable = canTarget(game, hero, e);
              return (
                <button
                  className={`enemy-card ${target?.id === e.id ? 'targeted' : ''} ${e.hp === 0 ? 'fallen' : ''}`}
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  disabled={!reachable || !yourTurn}
                  aria-pressed={target?.id === e.id}
                  aria-label={`Välj ${e.name}`}
                >
                  <div className="enemy-portrait">
                    {e.role === 'boss' ? (
                      <Skull size={37} />
                    ) : e.role === 'archer' ? (
                      <Target size={30} />
                    ) : (
                      <Swords size={30} />
                    )}
                  </div>
                  <div className="enemy-info">
                    <small>
                      {e.position === 'fram' ? 'FRAMLINJE' : 'BAKLINJE'}{' '}
                      {target?.id === e.id && '· VALT MÅL'}
                    </small>
                    <h3>{e.name}</h3>
                    <div className="enemy-values">
                      <span>
                        {e.hp} / {e.maxHp} liv
                      </span>
                      <span>
                        <Shield size={13} /> {e.ac}
                      </span>
                    </div>
                    <div className="meter red">
                      <span style={{ width: `${(e.hp / e.maxHp) * 100}%` }} />
                    </div>
                    {e.weaknesses?.length && (
                      <small className="gold">Svaghet: {e.weaknesses.join(', ')}</small>
                    )}
                    {e.resistances?.length && <small>Motstånd: {e.resistances.join(', ')}</small>}
                    {!reachable && e.hp > 0 && <small>Skyddad av framlinjen</small>}
                  </div>
                  {e.intent && (
                    <p className="intent">
                      Förbereder utfall mot {game.players.find((p) => p.id === e.intent)?.name}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          <div className="turn-label">
            <span className={`status-dot ${yourTurn ? 'live' : ''}`} />
            {yourTurn
              ? 'Din tur. Välj din handling.'
              : `${active?.name ?? 'Sällskapet'} har turen.`}
            <small>Du står i {c.positions[hero.id] === 'fram' ? 'framlinjen' : 'baklinjen'}.</small>
          </div>
          <div className="combat-actions">
            <button
              className="button primary"
              disabled={!yourTurn || !target}
              onClick={() => act({ type: 'attack', target: target!.id })}
            >
              <Swords size={17} />
              Anfall
            </button>
            <button
              className="button"
              title={ability.description}
              disabled={
                !yourTurn ||
                c.used[hero.id] ||
                (hero.className === 'Kleriker'
                  ? game.players.find((p) => p.id === ally)!.hp >=
                    game.players.find((p) => p.id === ally)!.maxHp
                  : hero.className !== 'Magiker' && !target)
              }
              onClick={() =>
                act({ type: 'ability', target: hero.className === 'Kleriker' ? ally : target?.id })
              }
            >
              <Flame size={17} />
              {ability.name}
            </button>
            <button className="button" disabled={!yourTurn} onClick={() => act({ type: 'defend' })}>
              <Shield size={17} />
              Försvara
            </button>
          </div>
          <p className="ability-description">
            {ability.description} Varje handling använder din tur.
          </p>
          <details className="tactics">
            <summary>Fler handlingar & föremål</summary>
            <div className="tactics-grid">
              <button
                className="button subtle"
                disabled={!yourTurn}
                onClick={() => act({ type: 'move' })}
              >
                <MoveHorizontal size={15} />
                Byt position
              </button>
              <button
                className="button subtle"
                disabled={!yourTurn || !!c.breached[hero.id]}
                onClick={() => act({ type: 'breakthrough' })}
              >
                <ChevronsRight size={15} />
                Bryt igenom
              </button>
              <button
                className="button subtle"
                disabled={!yourTurn || hero.potions < 1 || hero.hp >= hero.maxHp}
                onClick={() => act({ type: 'potion' })}
              >
                <HeartPulse size={15} />
                Läkebrygd ({hero.potions})
              </button>
              <button
                className="button subtle"
                disabled={!yourTurn || hero.herbs < 1 || hero.hp >= hero.maxHp}
                onClick={() => act({ type: 'herbs' })}
              >
                Örter ({hero.herbs})
              </button>
            </div>
            {(game.players.length > 1 ||
              hero.className === 'Kleriker' ||
              hero.className === 'Krigare') && (
              <div className="ally-actions">
                <label>
                  Kamrat
                  <select value={ally} onChange={(e) => setAlly(e.target.value)}>
                    {game.players.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name} · {p.hp}/{p.maxHp} liv
                      </option>
                    ))}
                  </select>
                </label>
                {game.players.length > 1 && (
                  <button
                    className="button subtle"
                    disabled={!yourTurn || ally === hero.id}
                    onClick={() => act({ type: 'help', target: ally })}
                  >
                    <HandHelping size={15} />
                    Hjälp
                  </button>
                )}
                {hero.className === 'Krigare' && (
                  <button
                    className="button subtle"
                    disabled={!yourTurn || c.used[hero.id]}
                    onClick={() => act({ type: 'protect', target: ally })}
                  >
                    <Shield size={15} />
                    Skydda
                  </button>
                )}
              </div>
            )}
          </details>
        </>
      )}
      <div className="combat-log">
        <button className="text-button" onClick={() => setFullLog(!fullLog)}>
          <ScrollText size={14} />
          {fullLog ? 'Visa senaste händelser' : 'Visa hela stridsloggen'}
          <span>{log.length} händelser</span>
        </button>
        <div role="log" aria-live="polite">
          {(fullLog ? log : log.slice(-4)).map((event) => (
            <p className={`log-${event.kind}`} key={event.id}>
              {event.text}
              {event.detail && <small>{event.detail}</small>}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
