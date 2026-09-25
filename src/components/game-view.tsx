'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Coins,
  Heart,
  Shield,
  Swords,
  Backpack,
  ChevronDown,
  MapPin,
  Skull,
  Check,
  Flag,
  Users,
  Save,
  Dices,
} from 'lucide-react';
import { getCampaign } from '../../packages/content/src';
import { availableChoices, sceneFor } from '../../packages/engine/src/engine';
import type {
  Character,
  GameCommand,
  GameState,
  SkillCheck,
  SkillCheckEvent,
} from '../../packages/engine/src/types';
import { WorldArt } from './world-art';
import { CombatPanel } from './combat-panel';
import { modifier } from '../../packages/engine/src/random';
import {
  attributeLabels,
  checkAttribute,
  checkChance,
  checkTarget,
} from '../../packages/engine/src/checks';
export function StoryText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(<strong>.*?<\/strong>)/g)
        .map((part, i) =>
          part.startsWith('<strong>') ? <strong key={i}>{part.slice(8, -9)}</strong> : part,
        )}
    </>
  );
}
/** The ability check that led into the current scene, if any. */
function sceneCheck(game: GameState, title: string) {
  const entry = game.events.findLastIndex((e) => e.kind === 'story' && e.text === title);
  for (let i = entry - 1; i >= 0 && game.events[i].kind !== 'story'; i--)
    if (game.events[i].check) return game.events[i];
  return undefined;
}
export function CharacterSheet({
  hero,
  act,
  canUse = true,
}: {
  hero: Character;
  act: (cmd: GameCommand) => void;
  canUse?: boolean;
}) {
  return (
    <>
      <div className="sheet-title">
        <div className="avatar large">
          <Swords size={28} />
        </div>
        <div>
          <h2>{hero.name}</h2>
          <p>
            {hero.race} · {hero.className} · Nivå {hero.level}
          </p>
        </div>
      </div>
      <div className="attribute-grid">
        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
          <div key={key}>
            <small>{attributeLabels[key]}</small>
            <strong>{hero[key]}</strong>
            <small>
              {modifier(hero[key]) >= 0 ? '+' : ''}
              {modifier(hero[key])}
            </small>
          </div>
        ))}
      </div>
      <h3>Utrustning</h3>
      <div className="equipment">
        <div>
          <Swords size={19} />
          <span>
            <small>VAPEN</small>
            {hero.weapon}
          </span>
          <b>
            {hero.damage[0]}T{hero.damage[1]}+{hero.damage[2]}
          </b>
        </div>
        <div>
          <Shield size={19} />
          <span>
            <small>RUSTNING</small>
            {hero.armor}
          </span>
          <b>AC {hero.ac}</b>
        </div>
        {hero.shield && (
          <div>
            <Shield size={19} />
            Liten sköld
          </div>
        )}
      </div>
      <h3>Ryggsäck</h3>
      <div className="inventory-items">
        <button
          className="button"
          disabled={!canUse || hero.potions === 0 || hero.hp >= hero.maxHp || hero.hp <= 0}
          onClick={() => act({ type: 'potion' })}
        >
          Läkebrygd × {hero.potions}
          <span>1T8+6 liv</span>
        </button>
        <button
          className="button"
          disabled={!canUse || hero.herbs === 0 || hero.hp >= hero.maxHp || hero.hp <= 0}
          onClick={() => act({ type: 'herbs' })}
        >
          Örter × {hero.herbs}
          <span>1T4+3 liv</span>
        </button>
        {hero.sigil && <p>◈ Draksigillet</p>}
        {hero.rope && <p>Rep</p>}
        {hero.torch && <p>Fnöske & fackla</p>}
        {hero.towerKey && <p>Järnmynt med drakmärke</p>}
      </div>
      <p className="muted">
        Talang: {hero.talent} · {hero.gold} guld
      </p>
    </>
  );
}
export function GameView({
  game,
  actorId,
  act,
  disabled,
  onSave,
  onMenu,
}: {
  game: GameState;
  actorId: string;
  act: (cmd: GameCommand) => void;
  disabled: boolean;
  onSave: () => void;
  onMenu: () => void;
}) {
  const [tab, setTab] = useState<'journal' | 'inventory'>('journal');
  const hero = game.players.find((p) => p.id === actorId) ?? game.players[0];
  const campaign = getCampaign(game.campaignId),
    scene = sceneFor(game, campaign, hero.id);
  const text = typeof scene.text === 'function' ? scene.text() : scene.text;
  const checkEvent = sceneCheck(game, scene.title);
  const [checkRoll, setCheckRoll] = useState<{
    next: string;
    label: string;
    check: SkillCheck;
    eventSeq: number;
    phase: 'ready' | 'rolling' | 'waiting' | 'result';
    result?: SkillCheckEvent;
  } | null>(null);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (rollTimer.current) clearTimeout(rollTimer.current);
    },
    [],
  );
  // The server decides the roll; the overlay waits for this hero's check event.
  useEffect(() => {
    if (checkRoll?.phase !== 'waiting') return;
    const event = game.events.find(
      (e) => e.id > checkRoll.eventSeq && e.check?.actorId === hero.id,
    );
    if (event?.check) setCheckRoll({ ...checkRoll, phase: 'result', result: event.check });
  }, [game.events, hero.id, checkRoll]);
  function rollCheck() {
    if (checkRoll?.phase !== 'ready') return;
    setCheckRoll({ ...checkRoll, phase: 'rolling' });
    rollTimer.current = setTimeout(() => {
      setCheckRoll((current) => (current ? { ...current, phase: 'waiting' } : null));
      act({ type: 'choose', next: checkRoll.next });
      // If the move is rejected no event arrives; don't leave the overlay hanging.
      rollTimer.current = setTimeout(
        () => setCheckRoll((current) => (current?.phase === 'waiting' ? null : current)),
        5000,
      );
    }, 900);
  }
  const chapter = game.visited.includes('skogsbyReturn')
    ? 'Kapitel I · Skogsby'
    : 'Prolog · Vakttornet';
  const locations = [
    { id: 'roadIntro', label: 'Kungsvägen' },
    { id: 'inn', label: 'Tre Lyktor' },
    { id: 'forest', label: 'Gråskogen' },
    { id: 'towerExterior', label: 'Vakttornet' },
    { id: 'skogsbyReturn', label: 'Skogsby' },
  ];
  const latest = locations.findLastIndex((loc) => game.visited.includes(loc.id));
  return (
    <div className="game-layout page-enter">
      <div className="adventure-column">
        <div className="scene-banner">
          <WorldArt compact />
          <div>
            <span className="eyebrow">{campaign.title}</span>
            <h2>{chapter}</h2>
            <p>
              <MapPin size={13} />
              {scene.title}
            </p>
          </div>
          <span className="badge">
            {game.players.length === 1 ? 'SOLO' : `${game.players.length} HJÄLTAR`}
          </span>
        </div>
        <div className="journey" aria-label="Resans platser">
          {locations.map((loc, i) => (
            <div
              key={loc.id}
              className={i === latest ? 'current' : game.visited.includes(loc.id) ? 'visited' : ''}
            >
              <span>
                {game.visited.includes(loc.id) && i !== latest ? <Check size={11} /> : i + 1}
              </span>
              <small>{loc.label}</small>
            </div>
          ))}
        </div>
        <article className="story-card">
          <div className="story-meta">
            <span className="eyebrow">
              <BookOpen size={13} /> {game.combat ? 'ETT MÖTE I MÖRKRET' : 'DIN BERÄTTELSE'}
            </span>
            <span className="muted">{String(game.journal.length).padStart(2, '0')}</span>
          </div>
          <h1 tabIndex={-1}>{scene.title}</h1>
          <div className="prose">
            {text.map((p, i) => (
              <p key={`${game.scene}-${i}`}>
                <StoryText text={p} />
              </p>
            ))}
          </div>
          {checkEvent?.check && (
            <div className={`check-result ${checkEvent.check.success ? 'success' : 'failure'}`}>
              <Dices size={16} />
              <span>
                <strong>{checkEvent.text}</strong>
                <small>{checkEvent.detail}</small>
              </span>
            </div>
          )}
          {game.world.xpNotice && (
            <div className="xp-notice">
              <Flag size={16} />
              {game.world.xpNotice}
            </div>
          )}
          {game.status === 'defeat' ? (
            <div className="defeat">
              <Skull size={36} />
              <h2>Mörkret vann den här gången.</h2>
              <p>Ladda en tidigare sparning eller börja en ny berättelse.</p>
              <button className="button" onClick={onSave}>
                Öppna sparningar
              </button>
              <button className="text-button" onClick={onMenu}>
                Till lägerelden
              </button>
            </div>
          ) : game.combat ? (
            <CombatPanel
              key={`${game.scene}-${hero.id}`}
              game={game}
              hero={hero}
              act={act}
              disabled={disabled}
            />
          ) : game.status === 'complete' ? (
            <div className="chapter-complete">
              <Flag size={30} />
              <p className="eyebrow">DETTA ÄVENTYR ÄR AVSLUTAT</p>
              <h2>Berättelsen lever vidare.</h2>
              <p>Din hjälte och alla dina val finns kvar i sparningen.</p>
              <button className="button primary" onClick={onSave}>
                <Save size={16} />
                Spara berättelsen
              </button>
              <button className="text-button" onClick={onMenu}>
                Till lägerelden
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="choices">
              <p className="eyebrow">VAD GÖR DU?</p>
              {availableChoices(game, campaign, hero.id).map(([label, next, check], i) => (
                <button
                  className="choice"
                  disabled={disabled}
                  key={next}
                  onClick={() =>
                    check
                      ? setCheckRoll({
                          next,
                          label,
                          check,
                          eventSeq: game.eventSeq,
                          phase: 'ready',
                        })
                      : act({ type: 'choose', next })
                  }
                >
                  <span className="choice-number">{String(i + 1).padStart(2, '0')}</span>
                  <span>{label}</span>
                  {check && (
                    <span
                      className="choice-check"
                      title={`${check.skill} check: ${hero.name} slår d20 + ${attributeLabels[checkAttribute(hero, check)]} mot DC ${check.dc}`}
                    >
                      <Dices size={13} />
                      {check.skill} · {attributeLabels[checkAttribute(hero, check)]} · DC{' '}
                      {check.dc} · {Math.round(checkChance(hero, check) * 100)}%
                    </span>
                  )}
                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
          )}
        </article>
        {checkRoll && (
          <div className="dice-overlay" role="dialog" aria-modal="true" aria-label="Ability Check">
            <div className="dice-panel">
              <p className="eyebrow">ABILITY CHECK · {checkRoll.check.skill.toUpperCase()}</p>
              <h2>{checkRoll.label}</h2>
              <p className="dice-context">
                {hero.name} · d20 + {attributeLabels[checkAttribute(hero, checkRoll.check)]} (
                {modifier(hero[checkAttribute(hero, checkRoll.check)]) >= 0 ? '+' : ''}
                {modifier(hero[checkAttribute(hero, checkRoll.check)])}) · DC {checkRoll.check.dc}
              </p>
              {checkRoll.phase !== 'result' && (
                <p className="dice-target">
                  {checkTarget(hero, checkRoll.check) <= 1 ? (
                    'Du lyckas vad tärningen än visar'
                  ) : checkTarget(hero, checkRoll.check) > 20 ? (
                    'Du kan inte lyckas med det här slaget'
                  ) : (
                    <>
                      Du behöver slå <strong>{checkTarget(hero, checkRoll.check)} eller mer</strong>{' '}
                      på d20
                    </>
                  )}{' '}
                  · {Math.round(checkChance(hero, checkRoll.check) * 100)}% chans
                </p>
              )}
              {checkRoll.phase !== 'result' || !checkRoll.result ? (
                <>
                  <div className={`dice-stage ${checkRoll.phase !== 'ready' ? 'rolling' : ''}`}>
                    <div className="die d20">
                      <span>D20</span>
                      <strong>?</strong>
                    </div>
                  </div>
                  <button
                    className="button primary dice-roll-button"
                    disabled={checkRoll.phase !== 'ready' || disabled}
                    onClick={rollCheck}
                  >
                    {checkRoll.phase === 'ready' ? 'Slå d20' : 'Tärningen rullar…'}
                  </button>
                  {checkRoll.phase === 'ready' && (
                    <button className="text-button" onClick={() => setCheckRoll(null)}>
                      Välj något annat
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="dice-stage dice-results">
                    <div className="die d20 chosen">
                      <span>D20</span>
                      <strong>{checkRoll.result.roll}</strong>
                    </div>
                  </div>
                  <div className="dice-equation">
                    <strong>
                      {checkRoll.result.roll} {checkRoll.result.modifier >= 0 ? '+' : '−'}{' '}
                      {Math.abs(checkRoll.result.modifier)} = {checkRoll.result.total}
                    </strong>
                    <span>mot DC {checkRoll.result.dc}</span>
                  </div>
                  <p className={`dice-verdict ${checkRoll.result.success ? 'hit' : 'miss'}`}>
                    {checkRoll.result.success ? 'Lyckat!' : 'Misslyckat!'}
                  </p>
                  <button
                    className="button primary dice-roll-button"
                    onClick={() => setCheckRoll(null)}
                  >
                    Fortsätt
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        <p className="scene-footer">
          Dina val lämnar spår. <span>◆</span> Ditt sällskap skriver historien.
        </p>
      </div>
      <aside className="game-sidebar">
        <div className="panel character-summary">
          <div className="character-name">
            <div className="avatar">
              <Swords size={22} />
            </div>
            <div>
              <h2>{hero.name}</h2>
              <p>
                {hero.race} · {hero.className}
              </p>
            </div>
            <span className="level">{hero.level}</span>
          </div>
          <div className="bar-label">
            <span>
              <Heart size={13} />
              Liv
            </span>
            <strong>
              {hero.hp} <span>/ {hero.maxHp}</span>
            </strong>
          </div>
          <div className="meter red">
            <span style={{ width: `${(hero.hp / hero.maxHp) * 100}%` }} />
          </div>
          <div className="bar-label small">
            <span>Erfarenhet</span>
            <span>
              {hero.xp} / {hero.nextXp}
            </span>
          </div>
          <div className="meter gold-meter">
            <span style={{ width: `${Math.min(100, (hero.xp / hero.nextXp) * 100)}%` }} />
          </div>
          <div className="summary-stats">
            <div>
              <Shield size={15} />
              <strong>{hero.ac}</strong>
              <small>AC</small>
            </div>
            <div>
              <Swords size={15} />
              <strong>+{hero.attackBonus}</strong>
              <small>Anfall</small>
            </div>
            <div>
              <Coins size={15} />
              <strong>{hero.gold}</strong>
              <small>Guld</small>
            </div>
          </div>
          <details>
            <summary>
              Visa karaktärsblad
              <ChevronDown size={14} />
            </summary>
            <CharacterSheet
              hero={hero}
              act={act}
              canUse={!game.combat && !disabled && game.status === 'active'}
            />
          </details>
        </div>
        {game.players.length > 1 && (
          <div className="panel party">
            <h3>
              <Users size={16} />
              Ditt sällskap
            </h3>
            {game.players.map((p) => (
              <div key={p.id}>
                <span>
                  {p.name}
                  {p.id === hero.id ? ' (du)' : ''}
                </span>
                <small>
                  {p.hp}/{p.maxHp} liv
                </small>
              </div>
            ))}
          </div>
        )}
        <div className="panel notebook">
          <div className="tabs">
            <button className={tab === 'journal' ? 'active' : ''} onClick={() => setTab('journal')}>
              <BookOpen size={15} />
              Journal
            </button>
            <button
              className={tab === 'inventory' ? 'active' : ''}
              onClick={() => setTab('inventory')}
            >
              <Backpack size={15} />
              Packning
            </button>
          </div>
          {tab === 'journal' ? (
            <>
              <p className="eyebrow">DITT NUVARANDE MÅL</p>
              <h3>
                {game.status === 'complete'
                  ? 'Följ den stulna kistan'
                  : latest >= 4
                    ? 'Lär känna Skogsby'
                    : latest >= 3
                      ? 'Avslöja tornets hemlighet'
                      : 'Hitta vägen till vakttornet'}
              </h3>
              <p className="muted">
                {game.world.wagonClue
                  ? 'En ny ledtråd väntar bortom byn.'
                  : 'Lyssna noga. Det som sägs längs vägen kan öppna nya möjligheter.'}
              </p>
              <div className="journal-list">
                {game.journal
                  .slice(-5)
                  .reverse()
                  .map((entry, i) => (
                    <div key={`${entry.turn}-${entry.scene}`}>
                      <span className={i === 0 ? 'gold' : ''}>◆</span>
                      <span>{entry.title}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <CharacterSheet
              hero={hero}
              act={act}
              canUse={!game.combat && !disabled && game.status === 'active'}
            />
          )}
        </div>
        {latest >= 4 && (
          <div className="panel relations">
            <p className="eyebrow">RELATIONER</p>
            {[
              ['Mira Hök', game.world.miraTrust],
              ['Runa Vargeld', game.world.smithTrust],
              ['Edric', game.world.edricTrust],
            ].map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <span className={Number(value) >= 2 ? 'green' : 'muted'}>
                  {Number(value) >= 2
                    ? 'Förtroende'
                    : Number(value) === 1
                      ? 'Nyfiken'
                      : 'Avvaktande'}
                </span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
