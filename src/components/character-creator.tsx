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
  Eye,
  Check,
} from 'lucide-react';
import { raceData, classData, talentData } from '../../packages/content/src';
import { createCharacter } from '../../packages/engine/src/characters';
import type { CharacterSelection } from '../../packages/engine/src/types';
const classIcons = { warrior: Swords, mage: WandSparkles, thief: Eye, cleric: Cross };
export function CharacterCreator({
  onSubmit,
  onBack,
  initial,
  online = false,
}: {
  onSubmit: (selection: CharacterSelection) => void;
  onBack: () => void;
  initial?: CharacterSelection;
  online?: boolean;
}) {
  const [selection, setSelection] = useState<CharacterSelection>(
    initial ?? { name: '', race: 'human', class: 'warrior', talent: 'iron' },
  );
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
              02 <span>Ursprung</span>
            </legend>
            <div className="option-grid four">
              {Object.entries(raceData).map(([key, item]) => (
                <button
                  key={key}
                  aria-pressed={selection.race === key}
                  className={`option-card ${selection.race === key ? 'selected' : ''}`}
                  onClick={() =>
                    setSelection({ ...selection, race: key as CharacterSelection['race'] })
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
                      setSelection({ ...selection, class: key as CharacterSelection['class'] })
                    }
                  >
                    <ClassIcon size={25} />
                    <div className="option-heading">{item.label}</div>
                    <p>{item.desc}</p>
                    <small>
                      {item.weapon} · {item.maxHp} grundliv
                    </small>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              04 <span>Talang</span>
            </legend>
            <div className="option-grid three">
              {Object.entries(talentData).map(([key, item]) => (
                <button
                  key={key}
                  aria-pressed={selection.talent === key}
                  className={`option-card ${selection.talent === key ? 'selected' : ''}`}
                  onClick={() =>
                    setSelection({ ...selection, talent: key as CharacterSelection['talent'] })
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
              <small>Försvar</small>
            </div>
            <div>
              <Swords size={18} />
              <strong>+{preview.attackBonus}</strong>
              <small>Anfall</small>
            </div>
          </div>
          <div className="attribute-grid">
            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key, i) => (
              <div key={key}>
                <small>{['STY', 'SMI', 'KON', 'INT', 'VIS', 'KAR'][i]}</small>
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
          <button
            className="button primary"
            disabled={!selection.name.trim()}
            onClick={() => onSubmit({ ...selection, name: selection.name.trim() })}
          >
            {online ? 'Gör mig redo' : 'Börja äventyret'}
            <ArrowRight size={17} />
          </button>
          <small className="muted">
            <Flame size={12} />{' '}
            {online ? 'Sällskapet väntar på dig.' : 'Ditt äventyr sparas automatiskt.'}
          </small>
        </aside>
      </div>
    </div>
  );
}
