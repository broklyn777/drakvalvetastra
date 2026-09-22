'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="not-found">
      <h1>Berättelsen tappade tråden.</h1>
      <p>Ladda om vyn. Din senaste autosparning finns kvar.</p>
      <button className="button primary" onClick={reset}>
        Försök igen
      </button>
    </main>
  );
}
