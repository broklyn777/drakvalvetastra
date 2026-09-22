'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Save, Download, Upload, Cloud, LogIn, Check, LoaderCircle } from 'lucide-react';
import type { GameController } from '../hooks/use-game';
import { api } from '../hooks/use-game';
import { BrowserSaveRepository, parseSave } from '../../packages/persistence/src/saves';
import { makeSave, type SaveFile } from '../../packages/protocol/src/schema';
import type { PublicUser } from '../../packages/protocol/src/room';
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Stäng">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SaveDialog({
  controller: c,
  onClose,
}: {
  controller: GameController;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<(SaveFile | null)[]>([]);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => {
    const repo = new BrowserSaveRepository(localStorage);
    setSlots(
      ['1', '2', '3'].map((slot) => {
        try {
          return repo.read(slot);
        } catch {
          return null;
        }
      }),
    );
  };
  useEffect(() => {
    refresh();
  }, []);
  const run = async (work: () => void | Promise<void>) => {
    setBusy(true);
    setFailure('');
    setMessage('');
    try {
      await work();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Sparningen misslyckades.');
    } finally {
      setBusy(false);
    }
  };
  const exportSave = () => {
    if (!c.game) return;
    const blob = new Blob([JSON.stringify(makeSave(c.game, c.game.players[0].name), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drakvalvet-${c.game.campaignId}-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Sparfilen har exporterats.');
  };
  return (
    <Modal title="Dina sparningar" onClose={onClose}>
      <p className="muted">
        Tre manuella platser och en separat autosparning. Sparfiler innehåller hela berättelsen,
        tärningsläget och pågående strid.
      </p>
      {c.room && (
        <p className="info-note">
          Multiplayerrummet sparas på servern efter varje drag. Exporterade kopior kan öppnas som
          solospel.
        </p>
      )}
      {failure && (
        <p className="error-inline" role="alert">
          {failure}
        </p>
      )}
      {message && (
        <p className="success-inline" role="status">
          <Check size={16} />
          {message}
        </p>
      )}
      <div className="save-slots">
        {slots.map((save, i) => (
          <div className="save-slot" key={i}>
            <span className="slot-number">0{i + 1}</span>
            <div>
              <strong>{save?.label ?? 'Tom sparplats'}</strong>
              <small>
                {save
                  ? new Date(save.savedAt).toLocaleString('sv-SE')
                  : 'Redo för en ny berättelse'}
              </small>
            </div>
            <button
              className="icon-button"
              title={`Spara på plats ${i + 1}`}
              aria-label={`Spara på plats ${i + 1}`}
              disabled={!c.game || busy}
              onClick={() =>
                run(() => {
                  new BrowserSaveRepository(localStorage).write(
                    String(i + 1),
                    c.game!,
                    `${c.game!.players[0].name} · ${c.game!.scene}`,
                  );
                  refresh();
                  setMessage(`Sparat på plats ${i + 1}.`);
                })
              }
            >
              <Save size={18} />
            </button>
            <button
              className="button small-button"
              disabled={!save || busy}
              onClick={() => {
                if (save) {
                  c.load(save.state);
                  onClose();
                }
              }}
            >
              Ladda
            </button>
          </div>
        ))}
      </div>
      {c.auto && (
        <button
          className="button full"
          onClick={() => {
            c.load(c.auto!);
            onClose();
          }}
        >
          Återuppta autosparning<span>{c.auto.players[0].name}</span>
        </button>
      )}
      <div className="import-export">
        <button className="button" disabled={!c.game} onClick={() => run(exportSave)}>
          <Download size={16} />
          Exportera JSON
        </button>
        <button className="button" onClick={() => input.current?.click()}>
          <Upload size={16} />
          Importera JSON
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void run(async () => {
              if (file.size > 1024 * 1024) throw new Error('Sparfilen får vara högst 1 MB.');
              const save = parseSave(JSON.parse(await file.text()));
              c.load(save.state);
              onClose();
            });
          }}
        />
      </div>
      <div className="cloud-saves">
        <h3>
          <Cloud size={18} />
          Kontosparningar
        </h3>
        <p className="muted">
          {c.user?.email
            ? 'Spara och fortsätt på en annan enhet. Plats 1 på ditt konto används nedan.'
            : 'Logga in för att spara mellan enheter.'}
        </p>
        <div className="import-export">
          <button
            className="button"
            disabled={!c.user?.email || !c.game || busy}
            onClick={() =>
              run(async () => {
                await api('/saves/1', 'PUT', makeSave(c.game!, c.game!.players[0].name));
                setMessage('Sparat på ditt konto.');
              })
            }
          >
            Spara på kontot
          </button>
          <button
            className="button"
            disabled={!c.user?.email || busy}
            onClick={() =>
              run(async () => {
                const data = await api<{ save: unknown }>('/saves/1');
                c.load(parseSave(data.save).state);
                onClose();
              })
            }
          >
            Ladda från kontot
          </button>
        </div>
      </div>
    </Modal>
  );
}
export function AccountDialog({
  controller: c,
  onClose,
}: {
  controller: GameController;
  onClose: () => void;
}) {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api<{ user: PublicUser }>(
        register ? '/auth/register' : '/auth/login',
        'POST',
        { email, password },
      );
      c.setUser(data.user);
      c.leave();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inloggningen misslyckades.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={c.user?.email ? 'Ditt konto' : register ? 'Skapa ditt konto' : 'Välkommen tillbaka'}
      onClose={onClose}
    >
      {c.user?.email ? (
        <>
          <p>
            Inloggad som <strong>{c.user.email}</strong>.
          </p>
          <p className="muted">
            Dina multiplayerrum, rollpersoner och kontosparningar finns kvar nästa gång du loggar
            in.
          </p>
          <button
            className="button"
            onClick={async () => {
              try {
                await api('/auth/logout', 'POST', {});
                c.setUser(null);
                c.leave();
                onClose();
              } catch (e) {
                c.report(e);
              }
            }}
          >
            Logga ut
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <p className="muted">
            Spara dina berättelser och återvänd till ditt sällskap på valfri enhet. Du kan också
            spela utan konto.
          </p>
          {error && (
            <p className="error-inline" role="alert">
              {error}
            </p>
          )}
          <label className="field-label" htmlFor="email">
            E-postadress
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="field-label" htmlFor="password">
            Lösenord · minst 10 tecken
          </label>
          <input
            id="password"
            type="password"
            minLength={10}
            maxLength={128}
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="button primary full" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}{' '}
            {register ? 'Skapa konto' : 'Logga in'}
          </button>
          <button type="button" className="text-button" onClick={() => setRegister(!register)}>
            {register ? 'Har du redan ett konto? Logga in' : 'Ny här? Skapa ett konto'}
          </button>
        </form>
      )}
    </Modal>
  );
}
