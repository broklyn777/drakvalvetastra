'use client';
import { useEffect, useRef, useState } from 'react';
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
import { attackAvailability, canTarget, currentActor } from '../../packages/engine/src/combat';
import type { Character, GameCommand, GameState, GameEvent } from '../../packages/engine/src/types';
import { D20, DiceBox } from './d20';
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
  const [diceRoll, setDiceRoll] = useState<{
    attackerId: string;
    targetId: string;
    eventSeq: number;
    phase: 'ready' | 'rolling' | 'waiting' | 'attack-result' | 'damage-rolling' | 'done';
    result?: NonNullable<GameEvent['dice']>;
  } | null>(null);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The damage button appears where "Slå D20" was; ignore taps until it has been visible a moment,
  // so a double tap (common on phones) never rolls damage by accident.
  const [damageArmed, setDamageArmed] = useState(false);
  const phase = diceRoll?.phase;
  useEffect(() => {
    setDamageArmed(false);
    if (phase !== 'attack-result') return;
    const timer = setTimeout(() => setDamageArmed(true), 600);
    return () => clearTimeout(timer);
  }, [phase]);
  const c = game.combat!;
  const active = currentActor(game);
  const yourTurn = !disabled && active?.id === hero.id && !c.victory && game.status === 'active';
  const target =
    c.enemies.find((e) => e.id === selected && canTarget(game, hero, e)) ??
    c.enemies.find((e) => canTarget(game, hero, e));
  const ability = abilities[hero.selection.class];
  // Healing Word and Lay On Hands target the ally chosen under "Fler handlingar".
  const healsAlly = hero.selection.class === 'cleric' || hero.selection.class === 'paladin';

  useEffect(() => {
    return () => {
      if (rollTimer.current) clearTimeout(rollTimer.current);
    };
  }, []);

  // A new hero's turn (party play): reset their choices, but keep an open dice panel.
  useEffect(() => {
    setSelected('');
    setAlly(hero.id);
  }, [hero.id]);

  useEffect(() => {
    if (!diceRoll || diceRoll.phase !== 'waiting') return;
    const event = game.events.find(
      (entry) =>
        entry.id > diceRoll.eventSeq &&
        entry.dice?.attackerId === diceRoll.attackerId &&
        entry.dice.targetId === diceRoll.targetId,
    );
    if (!event?.dice) return;
    setDiceRoll((current) =>
      current
        ? {
            ...current,
            phase: 'attack-result',
            result: event.dice,
          }
        : null,
    );
  }, [game.events, game.eventSeq, diceRoll]);

  function openAttackRoll(targetId: string) {
    setDiceRoll({
      attackerId: hero.id,
      targetId,
      eventSeq: game.eventSeq,
      phase: 'ready',
    });
  }

  function rollAttack() {
    if (!diceRoll || diceRoll.phase !== 'ready') return;
    setDiceRoll({ ...diceRoll, phase: 'rolling' });
    rollTimer.current = setTimeout(() => {
      setDiceRoll((current) => (current ? { ...current, phase: 'waiting' } : null));
      act({ type: 'attack', target: diceRoll.targetId });
    }, 630);
  }

  function revealDamage() {
    if (!diceRoll?.result?.damage || diceRoll.phase !== 'attack-result' || !damageArmed) return;
    setDiceRoll({ ...diceRoll, phase: 'damage-rolling' });
    rollTimer.current = setTimeout(() => {
      setDiceRoll((current) => (current ? { ...current, phase: 'done' } : null));
    }, 630);
  }

  const diceTarget = diceRoll ? c.enemies.find((e) => e.id === diceRoll.targetId) : undefined;
  const attacker = game.players.find((p) => p.id === diceRoll?.attackerId) ?? hero;

  function combatantName(id: string) {
    return (
      game.players.find((p) => p.id === id)?.name ??
      c.enemies.find((e) => e.id === id)?.name ??
      id
    );
  }

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
              const availability = attackAvailability(game, hero, e);
              return (
                <button
                  className={`enemy-card ${target?.id === e.id ? 'targeted' : ''} ${e.hp === 0 ? 'fallen' : ''}`}
                  key={e.id}
                  onClick={() => setSelected(e.id)}
                  disabled={e.hp === 0 || !yourTurn}
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
                    {c.usesDistance && e.hp > 0 && (
                      <small>
                        {e.distance} ft · {e.weapon}
                        {!availability.ok ? ` · ${availability.reason}` : ''}
                      </small>
                    )}
                    {!c.usesDistance && !reachable && e.hp > 0 && <small>Skyddad av framlinjen</small>}
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
            <small>
              {c.usesDistance
                ? `Position: ${c.distances[hero.id] ?? 0} ft · Movement: ${c.movementRemaining[hero.id] ?? 0} ft`
                : `Du står i ${c.positions[hero.id] === 'fram' ? 'framlinjen' : 'baklinjen'}.`}
            </small>
          </div>
          <div className="combat-actions">
            <button
              className="button primary"
              disabled={!yourTurn || !target || !attackAvailability(game, hero, target).ok}
              title={target ? attackAvailability(game, hero, target).reason : undefined}
              onClick={() => openAttackRoll(target!.id)}
            >
              <Swords size={17} />
              Anfall
            </button>
            {ability.timing !== 'passive' && (
              <button
                className="button"
                title={ability.description}
                disabled={
                  !yourTurn ||
                  c.used[hero.id] ||
                  (healsAlly
                    ? game.players.find((p) => p.id === ally)!.hp >=
                      game.players.find((p) => p.id === ally)!.maxHp
                    : hero.selection.class === 'warrior'
                      ? hero.hp >= hero.maxHp
                      : hero.selection.class !== 'mage' &&
                        (!target || !attackAvailability(game, hero, target).ok))
                }
                onClick={() => act({ type: 'ability', target: healsAlly ? ally : target?.id })}
              >
                <Flame size={17} />
                {ability.name}
              </button>
            )}
            <button className="button" disabled={!yourTurn} onClick={() => act({ type: 'defend' })}>
              <Shield size={17} />
              Försvara
            </button>
          </div>
          <p className="ability-description">
            {ability.description}{' '}
            {ability.timing === 'bonus'
              ? 'Övriga handlingar använder din tur.'
              : 'Varje handling använder din tur.'}
          </p>
          <details className="tactics">
            <summary>Fler handlingar & föremål</summary>
            <div className="tactics-grid">
              <button
                className="button subtle"
                disabled={!yourTurn || (c.usesDistance && (c.movementRemaining[hero.id] ?? 0) <= 0)}
                onClick={() => act({ type: 'move', target: target?.id })}
              >
                <MoveHorizontal size={15} />
                {c.usesDistance
                  ? `Flytta mot mål (${c.movementRemaining[hero.id] ?? 0} ft kvar)`
                  : 'Byt position'}
              </button>
              {c.usesDistance && (
                <button
                  className="button subtle"
                  disabled={!yourTurn || !target}
                  onClick={() => act({ type: 'dash', target: target?.id })}
                >
                  <ChevronsRight size={15} />
                  Dash mot mål (+{hero.speed} ft)
                </button>
              )}
              {!c.usesDistance && (
                <button
                  className="button subtle"
                  disabled={!yourTurn || !!c.breached[hero.id]}
                  onClick={() => act({ type: 'breakthrough' })}
                >
                  <ChevronsRight size={15} />
                  Bryt igenom
                </button>
              )}
              <button
                className="button subtle"
                disabled={!yourTurn || hero.potions < 1 || hero.hp >= hero.maxHp}
                onClick={() => act({ type: 'potion' })}
              >
                <HeartPulse size={15} />
                Läkebrygd ({hero.potions})
              </button>
              {hero.selection.talent === 'supply' ? (
                // Healer's Battle Medic: tend the ally chosen below (or yourself).
                <button
                  className="button subtle"
                  disabled={(() => {
                    const patient = game.players.find((p) => p.id === ally) ?? hero;
                    return !yourTurn || hero.herbs < 1 || patient.hp >= patient.maxHp;
                  })()}
                  onClick={() => act({ type: 'herbs', target: ally })}
                >
                  Battle Medic på {(game.players.find((p) => p.id === ally) ?? hero).name} (
                  {hero.herbs})
                </button>
              ) : (
                <button
                  className="button subtle"
                  disabled={!yourTurn || hero.herbs < 1 || hero.hp >= hero.maxHp}
                  onClick={() => act({ type: 'herbs' })}
                >
                  Örter ({hero.herbs})
                </button>
              )}
            </div>
            {(game.players.length > 1 ||
              healsAlly ||
              hero.selection.class === 'warrior') && (
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

              </div>
            )}
          </details>
        </>
      )}
      {diceRoll && diceTarget && (
        <div className="dice-overlay" role="dialog" aria-modal="true" aria-label="Tärningsslag">
          <div className="dice-panel">
            <p className="eyebrow">ATTACK ROLL</p>
            <h2>
              {attacker.name} mot {diceTarget.name}
            </h2>
            <p className="dice-context">
              {diceRoll.result?.attackName ?? attacker.weapon} · Attack Bonus +
              {diceRoll.result?.attack.bonus ?? attacker.attackBonus} · AC {diceTarget.ac}
            </p>

            {(diceRoll.phase === 'ready' || diceRoll.phase === 'rolling' || diceRoll.phase === 'waiting') && (
              <>
                <div className="dice-stage compact-dice-stage">
                  <D20 rolling={diceRoll.phase === 'rolling' || diceRoll.phase === 'waiting'} />
                </div>
                <button
                  className="button primary dice-roll-button"
                  disabled={diceRoll.phase !== 'ready'}
                  onClick={rollAttack}
                >
                  {diceRoll.phase === 'ready' ? 'Slå D20' : 'Tärningen rullar…'}
                </button>
              </>
            )}

            {diceRoll.result && ['attack-result', 'damage-rolling', 'done'].includes(diceRoll.phase) && (
              <>
                <div className="dice-stage compact-dice-stage dice-results">
                  {diceRoll.result.attack.rolls.map((value, index) => {
                    const chosen = value === diceRoll.result!.attack.chosen;
                    return (
                      <D20
                        key={`${value}-${index}`}
                        rolling={false}
                        value={value}
                        outcome={
                          chosen
                            ? diceRoll.result!.attack.critical
                              ? 'crit'
                              : diceRoll.result!.attack.hit
                                ? 'success'
                                : 'failure'
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
                <p className={`dice-verdict compact-verdict ${diceRoll.result.attack.hit ? 'hit' : 'miss'}`}>
                  {diceRoll.result.attack.critical
                    ? '✨ Critical Hit!'
                    : diceRoll.result.attack.hit
                      ? '✨ Träff!'
                      : '❌ Miss!'}{' '}
                  <strong>
                    {diceRoll.result.attack.chosen} + {diceRoll.result.attack.bonus} = {diceRoll.result.attack.total}
                  </strong>{' '}
                  <span>(Krav: AC {diceRoll.result.attack.ac})</span>
                </p>

                {!diceRoll.result.attack.hit && (
                  <button
                    className="button dice-roll-button"
                    disabled={!damageArmed}
                    onClick={() => setDiceRoll(null)}
                  >
                    Stäng
                  </button>
                )}

                {diceRoll.result.attack.hit && diceRoll.result.damage && diceRoll.phase === 'attack-result' && (
                  <button
                    className="button primary dice-roll-button"
                    disabled={!damageArmed}
                    onClick={revealDamage}
                  >
                    Slå {diceRoll.result.damage.rolls.length > 1 ? `${diceRoll.result.damage.rolls.length}×D${diceRoll.result.damage.sides}` : `D${diceRoll.result.damage.sides}`} skada
                  </button>
                )}

                {diceRoll.phase === 'damage-rolling' && diceRoll.result.damage && (
                  <div className="dice-stage compact-dice-stage damage-stage">
                    {diceRoll.result.damage.rolls.map((_, index) => (
                      <DiceBox
                        key={index}
                        rolling
                        sides={diceRoll.result!.damage!.sides}
                      />
                    ))}
                  </div>
                )}

                {diceRoll.phase === 'done' && diceRoll.result.damage && (
                  <>
                    <div className="dice-stage compact-dice-stage dice-results damage-stage">
                      {diceRoll.result.damage.rolls.map((value, index) => (
                        <DiceBox
                          key={`${value}-${index}`}
                          rolling={false}
                          value={value}
                          sides={diceRoll.result!.damage!.sides}
                        />
                      ))}
                    </div>
                    <div className="dice-equation">
                      <strong>
                        {diceRoll.result.damage.rolls.join(' + ')}
                        {diceRoll.result.damage.bonus
                          ? ` + ${diceRoll.result.damage.bonus}`
                          : ''}{' '}
                        = {diceRoll.result.damage.total}
                      </strong>
                      <span>{diceRoll.result.damageType ?? attacker.damageType}skada</span>
                    </div>
                    <button className="button dice-roll-button" onClick={() => setDiceRoll(null)}>
                      Fortsätt
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="combat-log">
        <button className="text-button" onClick={() => setFullLog(!fullLog)}>
          <ScrollText size={14} />
          {fullLog ? 'Visa senaste händelser' : 'Visa hela stridsloggen'}
          <span>{log.length} händelser</span>
        </button>
        <div role="log" aria-live="polite">
          {(fullLog ? log : log.slice(-4)).map((event) => {
            if (!event.dice) {
              return (
                <p className={`log-${event.kind}`} key={event.id}>
                  {event.text}
                  {event.detail && <small>{event.detail}</small>}
                </p>
              );
            }

            const dice = event.dice;
            const attack = dice.attack;
            const incoming = game.players.some((p) => p.id === dice.targetId);
            const outcome = attack.critical ? 'CRITICAL HIT' : attack.hit ? 'TRÄFF' : 'MISS';
            const modeLabel =
              attack.mode === 'advantage'
                ? 'Advantage'
                : attack.mode === 'disadvantage'
                  ? 'Disadvantage'
                  : null;
            const baseAc = attack.ac - (dice.coverBonus ?? 0);
            const damageNotation = dice.damage
              ? `${dice.damage.rolls.length}d${dice.damage.sides}${dice.damage.bonus >= 0 ? ' + ' : ' - '}${Math.abs(dice.damage.bonus)}`
              : null;

            return (
              <div
                className={`combat-roll-entry ${attack.hit ? 'hit' : 'miss'} ${incoming ? 'incoming' : 'outgoing'} ${attack.critical ? 'critical' : ''}`}
                key={event.id}
              >
                <strong className="combat-roll-heading">
                  {combatantName(dice.attackerId)} → {combatantName(dice.targetId)} ·{' '}
                  {dice.attackName ?? 'Attack'}
                  {typeof dice.distance === 'number' ? ` · ${dice.distance} ft` : ''}
                </strong>

                {!!dice.coverBonus && (
                  <span className="combat-roll-cover">
                    Half Cover: AC {baseAc} → {attack.ac}
                  </span>
                )}

                {attack.rolls.length > 1 && modeLabel && (
                  <span className="combat-roll-mode">
                    D20: {attack.rolls.join(' / ')} → använder {attack.chosen} · {modeLabel}
                  </span>
                )}

                <span className="combat-roll-attack">
                  {attack.rolls.length === 1 ? `D20 ${attack.chosen}` : attack.chosen} + {attack.bonus} ={' '}
                  {attack.total} vs AC {attack.ac} → <b>{outcome}</b>
                </span>

                {dice.damage && damageNotation && (
                  <span className="combat-roll-damage">
                    {damageNotation} = <b>{dice.damage.total} skada</b>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
