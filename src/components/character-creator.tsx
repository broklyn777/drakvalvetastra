'use client';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Swords,
  Heart,
  Flame,
  WandSparkles,
  Cross,
  Crosshair,
  ShieldPlus,
  Eye,
  Check,
} from 'lucide-react';
import { raceData, classData, talentData, pregenData } from '../../packages/content/src';
import { createCharacter } from '../../packages/engine/src/characters';
import { attributeLabels } from '../../packages/engine/src/checks';
import type { CharacterSelection, PregenId } from '../../packages/engine/src/types';
const classIcons = {
  warrior: Swords,
  mage: WandSparkles,
  thief: Eye,
  cleric: Cross,
  ranger: Crosshair,
  paladin: ShieldPlus,
};
export function CharacterCreator({
  onSubmit,
  onSubmitParty,
  onBack,
  initial,
  online = false,
}: {
  onSubmit: (selection: CharacterSelection) => void;
  /** Local party of 2–4 heroes; not offered online, where each player brings one hero. */
  onSubmitParty?: (selections: CharacterSelection[]) => void;
  onBack: () => void;
  initial?: CharacterSelection;
  online?: boolean;
}) {
  const [selection, setSelection] = useState<CharacterSelection>(
    initial ?? { name: '', race: 'human', class: 'warrior', talent: 'iron' },
  );
  const [partyMode, setPartyMode] = useState(false);
  const [party, setParty] = useState<CharacterSelection[]>([]);
  const canParty = !!onSubmitParty && !online;
  const inParty = (id: PregenId) => party.some((p) => p.pregen === id);
  const togglePregen = (id: PregenId) => {
    const hero = pregenData[id];
    if (inParty(id)) return setParty(party.filter((p) => p.pregen !== id));
    if (party.length >= 4) return;
    setParty([
      ...party,
      { name: hero.name, race: hero.race, class: hero.class, talent: hero.talent, pregen: id },
    ]);
  };
  const addCustom = () => {
    if (party.length >= 4 || !selection.name.trim()) return;
    setParty([...party, { ...selection, name: selection.name.trim(), pregen: undefined }]);
  };
  const preview = createCharacter(
    { ...selection, name: selection.name || 'Din hjälte' },
    'preview',
  );
  const Icon = classIcons[selection.class];
  return (
    <div className="creation page-enter">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={16} /> Tillbaka
      </button>
      <div className="section-heading">
        <div>
          <p className="eyebrow">VARJE LEGENDA HAR EN BÖRJAN</p>
          <h1>Vem vandrar in i mörkret?</h1>
          <p>Välj ditt ursprung, din väg och det som gör dig unik.</p>
        </div>
      </div>
      <div className="creation-layout">
        <div>
          <fieldset className="pregens">
            <legend>
              ★ <span>Färdiga hjältar · D&D 2024, nivå 1</span>
            </legend>
            {canParty && (
              <div className="mode-toggle" role="group" aria-label="Solo eller sällskap">
                <button
                  className={!partyMode ? 'active' : ''}
                  aria-pressed={!partyMode}
                  onClick={() => setPartyMode(false)}
                >
                  Solo
                </button>
                <button
                  className={partyMode ? 'active' : ''}
                  aria-pressed={partyMode}
                  onClick={() => setPartyMode(true)}
                >
                  Sällskap (2–4 hjältar)
                </button>
              </div>
            )}
            <div className="option-grid pregen-grid">
              {(Object.entries(pregenData) as [PregenId, (typeof pregenData)[PregenId]][]).map(
                ([key, hero]) => {
                  const PregenIcon = classIcons[hero.class];
                  return (
                    <button
                      key={key}
                      aria-pressed={partyMode ? inParty(key) : selection.pregen === key}
                      className={`option-card ${(partyMode ? inParty(key) : selection.pregen === key) ? 'selected' : ''}`}
                      onClick={() =>
                        partyMode
                          ? togglePregen(key)
                          : setSelection({
                              name: hero.name,
                              race: hero.race,
                              class: hero.class,
                              talent: hero.talent,
                              pregen: key,
                            })
                      }
                    >
                      <div className="option-heading">
                        <PregenIcon size={20} />
                        {hero.name}
                        {(partyMode ? inParty(key) : selection.pregen === key) && (
                          <Check size={15} />
                        )}
                      </div>
                      <p>{hero.desc}</p>
                      <small>
                        {raceData[hero.race].label} · {classData[hero.class].label} ·{' '}
                        {hero.background} · {talentData[hero.talent].label}
                      </small>
                    </button>
                  );
                },
              )}
            </div>
            <p className="pregen-hint">
              {partyMode
                ? 'Klicka för att lägga till eller ta bort. Du kan också bygga en egen hjälte nedan och lägga till den.'
                : 'Eller bygg en egen hjälte nedan.'}
            </p>
          </fieldset>
          <label className="field-label" htmlFor="hero-name">
            01 <span>Din hjältes namn</span>
          </label>
          <input
            id="hero-name"
            autoComplete="off"
            maxLength={24}
            placeholder="Vad kallas du i dessa trakter?"
            value={selection.name}
            onChange={(e) => setSelection({ ...selection, name: e.target.value })}
          />
          <fieldset>
            <legend>
              02 <span>Species</span>
            </legend>
            <div className="option-grid four">
              {Object.entries(raceData).map(([key, item]) => (
                <button
                  key={key}
                  aria-pressed={selection.race === key}
                  className={`option-card ${selection.race === key ? 'selected' : ''}`}
                  onClick={() =>
                    setSelection({
                      ...selection,
                      race: key as CharacterSelection['race'],
                      pregen: undefined,
                    })
                  }
                >
                  <div className="option-heading">
                    {item.label}
                    {selection.race === key && <Check size={15} />}
                  </div>
                  <p>{item.desc}</p>
                  <small>{item.bonus}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              03 <span>Klass</span>
            </legend>
            <div className="option-grid four">
              {Object.entries(classData).map(([key, item]) => {
                const ClassIcon = classIcons[key as keyof typeof classIcons];
                return (
                  <button
                    key={key}
                    aria-pressed={selection.class === key}
                    className={`option-card ${selection.class === key ? 'selected' : ''}`}
                    onClick={() =>
                      setSelection({
                        ...selection,
                        class: key as CharacterSelection['class'],
                        pregen: undefined,
                      })
                    }
                  >
                    <ClassIcon size={25} />
                    <div className="option-heading">{item.label}</div>
                    <p>{item.desc}</p>
                    <small>{item.bonus}</small>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              04 <span>Origin Feat</span>
            </legend>
            <div className="option-grid four">
              {Object.entries(talentData).map(([key, item]) => (
                <button
                  key={key}
                  aria-pressed={selection.talent === key}
                  className={`option-card ${selection.talent === key ? 'selected' : ''}`}
                  onClick={() =>
                    setSelection({
                      ...selection,
                      talent: key as CharacterSelection['talent'],
                      pregen: undefined,
                    })
                  }
                >
                  <div className="option-heading">
                    {item.label}
                    {selection.talent === key && <Check size={15} />}
                  </div>
                  <p>{item.desc}</p>
                  <small>{item.bonus}</small>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <aside className="hero-preview panel">
          <div className={`hero-emblem ${selection.class}`}>
            <Icon size={64} strokeWidth={1} />
          </div>
          <p className="eyebrow">DIN ROLLPERSON</p>
          <h2>{preview.name}</h2>
          <p>
            {preview.race} · {preview.className}
            {selection.pregen && ` · ${pregenData[selection.pregen].background}`}
          </p>
          <div className="preview-stats">
            <div>
              <Heart size={18} />
              <strong>{preview.maxHp}</strong>
              <small>Liv</small>
            </div>
            <div>
              <Shield size={18} />
              <strong>{preview.ac}</strong>
              <small>AC</small>
            </div>
            <div>
              <Swords size={18} />
              <strong>+{preview.attackBonus}</strong>
              <small>Anfall</small>
            </div>
          </div>
          <div className="attribute-grid">
            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
              <div key={key}>
                <small>{attributeLabels[key]}</small>
                <strong>{preview[key]}</strong>
              </div>
            ))}
          </div>
          <p className="preview-equipment">
            {preview.weapon}
            <br />
            {preview.armor}
            <br />
            {preview.potions} läkebrygder · {preview.herbs} örter
          </p>
          {partyMode ? (
            <div className="party-builder">
              <p className="eyebrow">DITT SÄLLSKAP · {party.length}/4</p>
              {party.length === 0 && <p className="muted">Välj hjältar ovan.</p>}
              <ul>
                {party.map((member, i) => (
                  <li key={`${member.pregen ?? member.name}-${i}`}>
                    <span>
                      {member.name}
                      <small>
                        {' '}
                        · {raceData[member.race].label} {classData[member.class].label}
                      </small>
                    </span>
                    <button
                      className="text-button"
                      aria-label={`Ta bort ${member.name}`}
                      onClick={() => setParty(party.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="button"
                disabled={party.length >= 4 || !selection.name.trim() || !!selection.pregen}
                onClick={addCustom}
                title="Bygg en egen hjälte till vänster, ge den ett namn och lägg till den."
              >
                Lägg till min egen hjälte
              </button>
              <button
                className="button primary"
                disabled={party.length < 2}
                onClick={() => onSubmitParty?.(party)}
              >
                Börja med sällskapet
                <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <button
              className="button primary"
              disabled={!selection.name.trim()}
              onClick={() => onSubmit({ ...selection, name: selection.name.trim() })}
            >
              {online ? 'Gör mig redo' : 'Börja äventyret'}
              <ArrowRight size={17} />
            </button>
          )}
          <small className="muted">
            <Flame size={12} />{' '}
            {online ? 'Sällskapet väntar på dig.' : 'Ditt äventyr sparas automatiskt.'}
          </small>
        </aside>
      </div>
    </div>
  );
}
