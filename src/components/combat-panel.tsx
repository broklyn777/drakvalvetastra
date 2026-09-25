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
import {
  attackAvailability,
  attackCover,
  canTarget,
  currentActor,
} from '../../packages/engine/src/combat';
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
    targetId: string;
    eventSeq: number;
    phase: 'ready' | 'rolling' | 'waiting' | 'attack-result' | 'damage-rolling' | 'done';
    result?: NonNullable<GameEvent['dice']>;
  } | null>(null);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const c = game.combat!;
  const currentCover = c.terrain?.find((feature) => feature.id === c.coveredBy?.[hero.id]);
  const active = currentActor(game);
  const yourTurn = !disabled && active?.id === hero.id && !c.victory && game.status === 'active';
  const target =
    c.enemies.find((e) => e.id === selected && canTarget(game, hero, e)) ??
    c.enemies.find((e) => canTarget(game, hero, e));
  const ability = abilities[hero.selection.class];

  useEffect(() => {
    return () => {
      if (rollTimer.current) clearTimeout(rollTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!diceRoll || diceRoll.phase !== 'waiting') return;
    const event = game.events.find(
      (entry) =>
        entry.id > diceRoll.eventSeq &&
        entry.dice?.attackerId === hero.id &&
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
  }, [game.events, game.eventSeq, hero.id, diceRoll]);

  function openAttackRoll(targetId: string) {
    setDiceRoll({
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
    if (!diceRoll?.result?.damage || diceRoll.phase !== 'attack-result') return;
    setDiceRoll({ ...diceRoll, phase: 'damage-rolling' });
    rollTimer.current = setTimeout(() => {
      setDiceRoll((current) => (current ? { ...current, phase: 'done' } : null));
    }, 630);
  }

  const diceTarget = diceRoll ? c.enemies.find((e) => e.id === diceRoll.targetId) : undefined;

  function combatantName(id: string) {
    return (
      game.players.find((p) => p.id === id)?.name ?? c.enemies.find((e) => e.id === id)?.name ?? id
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
                        <Shield size={13} /> AC {e.ac}
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
                    {!c.usesDistance && !reachable && e.hp > 0 && (
                      <small>{availability.reason}</small>
                    )}
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
          {!!c.terrain?.length && (
            <div className="terrain-panel" aria-label="Skydd och siktlinjer">
              <strong>Skydd på slagfältet</strong>
              <small>
                Förflyttning till skydd kostar rörelse men ingen handling. Totalt skydd skymmer
                sikten åt båda håll.
              </small>
              <div className="terrain-spots">
                {c.terrain.map((feature) => (
                  <button
                    className="button subtle"
                    key={feature.id}
                    disabled={
                      !yourTurn ||
                      (c.movementRemaining[hero.id] ?? 0) <= 0 ||
                      c.coveredBy?.[hero.id] === feature.id
                    }
                    onClick={() => act({ type: 'move', target: feature.id })}
                  >
                    <Shield size={15} /> {feature.name} · {feature.distance} ft ·{' '}
                    {feature.cover === 'half' ? 'Half Cover +2 AC' : 'Totalt skydd'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="turn-label">
            <span className={`status-dot ${yourTurn ? 'live' : ''}`} />
            {yourTurn
              ? 'Din tur. Välj din handling.'
              : `${active?.name ?? 'Sällskapet'} har turen.`}
            <small>
              {c.usesDistance
                ? `Position: ${c.distances[hero.id] ?? 0} ft · Rörelse: ${c.movementRemaining[hero.id] ?? 0} ft${currentCover ? ` · Skydd: ${currentCover.name}` : ''}`
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
            {c.usesDistance && target && !attackAvailability(game, hero, target).ok && (
              <button
                className="button"
                disabled={!yourTurn || (c.movementRemaining[hero.id] ?? 0) <= 0}
                onClick={() => act({ type: 'move', target: target.id })}
              >
                <MoveHorizontal size={17} /> Flytta närmare
              </button>
            )}
            <button
              className="button"
              title={ability.description}
              disabled={
                !yourTurn ||
                c.used[hero.id] ||
                (hero.className === 'Kleriker'
                  ? game.players.find((p) => p.id === ally)!.hp >=
                    game.players.find((p) => p.id === ally)!.maxHp
                  : hero.className === 'Magiker'
                    ? !c.enemies.some((e) => e.hp > 0 && !attackCover(game, hero.id, e.id).blocked)
                    : !target || !attackAvailability(game, hero, target).ok)
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
            {ability.description} Anfall och förmågor använder din handling; vanlig förflyttning gör
            det inte.
          </p>
          <details className="tactics">
            <summary>Fler handlingar & föremål</summary>
            <div className="tactics-grid">
              <button
                className="button subtle"
                disabled={!yourTurn || (c.movementRemaining[hero.id] ?? 0) <= 0}
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
              </div>
            )}
          </details>
        </>
      )}
      {diceRoll && diceTarget && (
        <div className="dice-overlay" role="dialog" aria-modal="true" aria-label="Tärningsslag">
          <div className="dice-panel">
            <p className="eyebrow">ANFALLSSLAG</p>
            <h2>
              {hero.name} mot {diceTarget.name}
            </h2>
            <p className="dice-context">
              {hero.weapon} · Anfallsbonus +{hero.attackBonus} · AC{' '}
              {diceTarget.ac +
                (hero.className === 'Magiker'
                  ? attackCover(game, hero.id, diceTarget.id).bonus
                  : 0)}
            </p>

            {(diceRoll.phase === 'ready' ||
              diceRoll.phase === 'rolling' ||
              diceRoll.phase === 'waiting') && (
              <>
                <div className="dice-stage compact-dice-stage">
                  <D20 rolling={diceRoll.phase === 'rolling' || diceRoll.phase === 'waiting'} />
                </div>
                <button
                  className="button primary dice-roll-button"
                  disabled={diceRoll.phase !== 'ready'}
                  onClick={rollAttack}
                >
                  {diceRoll.phase === 'ready' ? 'Slå T20' : 'Tärningen rullar…'}
                </button>
              </>
            )}

            {diceRoll.result &&
              ['attack-result', 'damage-rolling', 'done'].includes(diceRoll.phase) && (
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
                  <p
                    className={`dice-verdict compact-verdict ${diceRoll.result.attack.hit ? 'hit' : 'miss'}`}
                  >
                    {diceRoll.result.attack.critical
                      ? '✨ Kritisk träff!'
                      : diceRoll.result.attack.hit
                        ? '✨ Träff!'
                        : '❌ Miss!'}{' '}
                    <strong>
                      T20 {diceRoll.result.attack.chosen}{' '}
                      {diceRoll.result.attack.bonus >= 0 ? '+' : '−'}{' '}
                      {Math.abs(diceRoll.result.attack.bonus)} = {diceRoll.result.attack.total}
                    </strong>{' '}
                    <span>(mot AC {diceRoll.result.attack.ac})</span>
                  </p>

                  {!diceRoll.result.attack.hit && (
                    <button className="button dice-roll-button" onClick={() => setDiceRoll(null)}>
                      Stäng
                    </button>
                  )}

                  {diceRoll.result.attack.hit &&
                    diceRoll.result.damage &&
                    diceRoll.phase === 'attack-result' && (
                      <button className="button primary dice-roll-button" onClick={revealDamage}>
                        Slå{' '}
                        {diceRoll.result.damage.rolls.length > 1
                          ? `${diceRoll.result.damage.rolls.length}×T${diceRoll.result.damage.sides}`
                          : `T${diceRoll.result.damage.sides}`}{' '}
                        skada
                      </button>
                    )}

                  {diceRoll.phase === 'damage-rolling' && diceRoll.result.damage && (
                    <div className="dice-stage compact-dice-stage damage-stage">
                      {diceRoll.result.damage.rolls.map((_, index) => (
                        <DiceBox key={index} rolling sides={diceRoll.result!.damage!.sides} />
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
                        <span>{hero.damageType}skada</span>
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
            const outcome = attack.critical ? 'KRITISK TRÄFF' : attack.hit ? 'TRÄFF' : 'MISS';
            const modeLabel =
              attack.mode === 'advantage'
                ? 'Fördel'
                : attack.mode === 'disadvantage'
                  ? 'Nackdel'
                  : null;
            const baseAc = attack.ac - (dice.coverBonus ?? 0);
            const damageNotation = dice.damage
              ? `${dice.damage.rolls.length}T${dice.damage.sides} (${dice.damage.rolls.join(' + ')})${dice.damage.bonus ? ` ${dice.damage.bonus >= 0 ? '+' : '−'} ${Math.abs(dice.damage.bonus)}` : ''}`
              : null;
            const totalRolled = (dice.damage?.total ?? 0) + (dice.bonusDamage?.total ?? 0);

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
                    Half Cover ({dice.coverSource ?? 'varelse'}): AC {baseAc} → {attack.ac}
                  </span>
                )}

                {attack.rolls.length > 1 && modeLabel && (
                  <span className="combat-roll-mode">
                    T20: {attack.rolls.join(' / ')} → använder {attack.chosen} · {modeLabel}
                  </span>
                )}

                <span className="combat-roll-attack">
                  T20 {attack.chosen} {attack.bonus >= 0 ? '+' : '−'} {Math.abs(attack.bonus)} ={' '}
                  {attack.total} vs AC {attack.ac} → <b>{outcome}</b>
                </span>

                {dice.damage && damageNotation && (
                  <span className="combat-roll-damage">
                    {damageNotation}
                    {dice.bonusDamage &&
                      ` + ${dice.bonusDamage.rolls.length}T${dice.bonusDamage.sides} (${dice.bonusDamage.rolls.join(' + ')})`}
                    {' = '}
                    <b>{totalRolled} skada</b>
                  </span>
                )}
                {dice.damage &&
                  dice.appliedDamage !== undefined &&
                  dice.appliedDamage !== totalRolled && (
                    <span className="combat-roll-damage">
                      Efter sårbarhet eller motstånd: <b>{dice.appliedDamage} skada</b>
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
