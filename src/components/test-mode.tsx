'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, Link2, Play, Shuffle } from 'lucide-react';
import { campaigns, classData, raceData, talentData } from '../../packages/content/src';
import {
  defaultTestSelection,
  parseTestParams,
  randomSeed,
  testItems,
  testParams,
  testScenes,
  type TestItem,
  type TestStart,
} from '../../packages/engine/src/testing';
import type { CharacterSelection } from '../../packages/engine/src/types';

/** Starts a game from `?scen=…` once on load; the query is then removed so reloads don't repeat it. */
export function useTestLink(enabled: boolean, onStart: (test: TestStart) => void) {
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || done.current) return;
    done.current = true;
    const test = parseTestParams(new URLSearchParams(window.location.search), campaigns);
    if (!test) return;
    window.history.replaceState(null, '', window.location.pathname);
    onStart(test);
  }, [enabled, onStart]);
}

export function TestMode({ onStart }: { onStart: (test: TestStart) => void }) {
  const [campaignId, setCampaignId] = useState('watchtower');
  const scenes = useMemo(() => testScenes(campaigns[campaignId]), [campaignId]);
  const [scene, setScene] = useState('towerExterior');
  const [selection, setSelection] = useState<CharacterSelection>(defaultTestSelection);
  const [items, setItems] = useState<TestItem[]>(['rope', 'sigil']);
  const [seed, setSeed] = useState(() => randomSeed());
  const [link, setLink] = useState('');
  const test: TestStart = {
    campaignId,
    scene: scenes.some((s) => s.id === scene) ? scene : scenes[0].id,
    selection,
    seed,
    items,
  };
  const set = (key: keyof CharacterSelection) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setSelection({ ...selection, [key]: e.target.value });

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?${testParams(test)}`;
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked; the link is shown below for manual copying.
    }
  }

  return (
    <details className="test-mode panel">
      <summary>
        <FlaskConical size={16} />
        <span>
          <strong>Testläge</strong>
          <small>Hoppa direkt till en scen · bara i preview och lokalt</small>
        </span>
      </summary>
      <div className="test-mode-grid">
        <label>
          Kampanj
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            {Object.values(campaigns).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Scen
          <select value={test.scene} onChange={(e) => setScene(e.target.value)}>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Folk
          <select value={selection.race} onChange={set('race')}>
            {Object.entries(raceData).map(([id, r]) => (
              <option key={id} value={id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Klass
          <select value={selection.class} onChange={set('class')}>
            {Object.entries(classData).map(([id, c]) => (
              <option key={id} value={id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Talang
          <select value={selection.talent} onChange={set('talent')}>
            {Object.entries(talentData).map(([id, t]) => (
              <option key={id} value={id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seed
          <span className="test-seed">
            <input
              inputMode="numeric"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value.replace(/\D/g, '')) || 1)}
            />
            <button
              type="button"
              className="button"
              aria-label="Nytt slumpat seed"
              onClick={() => setSeed(randomSeed())}
            >
              <Shuffle size={15} />
            </button>
          </span>
        </label>
      </div>
      <fieldset className="test-items">
        <legend>Föremål</legend>
        {(Object.entries(testItems) as [TestItem, string][]).map(([id, label]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={items.includes(id)}
              onChange={(e) =>
                setItems(e.target.checked ? [...items, id] : items.filter((i) => i !== id))
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="test-hint">
        Samma seed ger samma tärningsslag. Byt seed för att se ett annat utfall.
      </p>
      <div className="test-actions">
        <button className="button primary" onClick={() => onStart(test)}>
          <Play size={16} />
          Starta här
        </button>
        <button className="button" onClick={copyLink}>
          <Link2 size={16} />
          Kopiera länk
        </button>
      </div>
      {link && (
        <input className="test-link" readOnly value={link} onFocus={(e) => e.target.select()} />
      )}
    </details>
  );
}
