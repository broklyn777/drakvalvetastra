'use client';
import { useState } from 'react';
import {
  Flame,
  Compass,
  Users,
  Swords,
  Save,
  Settings,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Clock3,
  ShieldCheck,
  UserRound,
  X,
  ScrollText,
  Sprout,
} from 'lucide-react';
import { useGame } from '../hooks/use-game';
import { campaigns } from '../../packages/content/src';
import { currentActor } from '../../packages/engine/src/combat';
import { parseSave } from '../../packages/persistence/src/saves';
import { WorldArt } from './world-art';
import { CharacterCreator } from './character-creator';
import { GameView } from './game-view';
import { Multiplayer } from './multiplayer';
import { AccountDialog, Modal, SaveDialog } from './dialogs';
import { TestMode, openTestMode, useTestLink } from './test-mode';
export default function Drakvalvet({
  buildInfo,
}: {
  buildInfo: { environment: 'PREVIEW' | 'PRODUCTION' | 'LOCAL'; branch: string; patch: string };
}) {
  const c = useGame();
  useTestLink(true, c.startTest);
  const [dialog, setDialog] = useState<'save' | 'account' | 'help' | null>(null);
  const selected = campaigns[c.campaignId];
  const heroId = c.room
    ? (c.user?.id ?? '')
    : ((c.game?.combat && !c.game.combat.victory ? currentActor(c.game)?.id : undefined) ??
      c.game?.players.find((p) => p.hp > 0)?.id ??
      c.game?.players[0].id ??
      '');
  const navigate = (screen: typeof c.screen) => {
    c.setError('');
    c.setScreen(screen);
  };
  return (
    <div className="app-shell">
      <aside className="app-nav">
        <a href="#main" className="brand" aria-label="Drakvalvet – till huvudinnehåll">
          <div className="brand-mark">
            <Flame size={30} strokeWidth={1.2} />
          </div>
          <div>
            DRAKVALVET<small>BERÄTTELSER FRÅN GRÅSKOGEN</small>
          </div>
        </a>
        <div className="nav-label">DIN VÄRLD</div>
        <nav aria-label="Huvudnavigation">
          <button
            className={['home', 'creation', 'game'].includes(c.screen) ? 'active' : ''}
            onClick={() => navigate(c.game ? 'game' : 'home')}
          >
            <Compass size={19} />
            Äventyr
            <ChevronRight size={14} />
          </button>
          <button
            className={c.screen === 'characters' ? 'active' : ''}
            onClick={() => navigate('characters')}
          >
            <Swords size={19} />
            Rollpersoner<span className="nav-count">{c.roster.length}</span>
          </button>
          <button
            className={c.screen === 'multiplayer' ? 'active' : ''}
            onClick={() => navigate(c.room?.game ? 'game' : 'multiplayer')}
          >
            <Users size={19} />
            Sällskap{c.room && <span className="status-dot live" />}
          </button>
          <button onClick={() => setDialog('save')}>
            <Save size={19} />
            Sparningar
          </button>
        </nav>
        <div className="nav-divider" />
        <div className="nav-note">
          <span className="eyebrow">UR VÄKTARNAS KRÖNIKA</span>
          <p>”Vissa dörrar byggdes inte för att öppnas.”</p>
          <span>— Edric från Tre Lyktor</span>
        </div>
        <div className="nav-bottom">
          <div className="system-state">
            <span
              className={`status-dot ${c.room ? (c.connection === 'online' ? 'live' : '') : 'live'}`}
            />
            {c.room
              ? c.connection === 'online'
                ? 'Sällskapet är anslutet'
                : 'Återansluter…'
              : 'Redo för äventyr'}
            <small>EN NY BÖRJAN · v0.1</small>
          </div>
          <button onClick={() => setDialog('help')}>
            <Settings size={17} />
            Spelguide
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Gråskogens krönikor</span>
            <ChevronRight size={12} />
            <strong>
              {c.screen === 'game'
                ? selected.title
                : c.screen === 'creation'
                  ? 'Ny rollperson'
                  : c.screen === 'multiplayer'
                    ? 'Sällskap'
                    : c.screen === 'characters'
                      ? 'Dina hjältar'
                      : 'Äventyr'}
            </strong>
          </div>
          <div className="topbar-actions">
            {c.game && (
              <button
                className="icon-button"
                title="Sparningar"
                aria-label="Öppna sparningar"
                onClick={() => setDialog('save')}
              >
                <Save size={17} />
              </button>
            )}
            <button className="account-button" onClick={() => setDialog('account')}>
              <div className="avatar tiny">
                <UserRound size={15} />
              </div>
              <span>{c.user?.email?.split('@')[0] ?? 'Äventyrare'}</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          {c.error && (
            <div className="toast error" role="alert">
              <span>{c.error}</span>
              <button aria-label="Stäng felmeddelandet" onClick={() => c.setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {c.notice && (
            <div className="toast" role="status">
              <span>{c.notice}</span>
              <button aria-label="Stäng meddelandet" onClick={() => c.setNotice('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {c.screen === 'home' && (
            <div className="home page-enter">
              <div className={`build-banner ${buildInfo.environment.toLowerCase()}`}>
                <strong>{buildInfo.environment}</strong>
                <span className="build-patch-type">STRIDSPATCH</span>
                <span>{buildInfo.branch}</span>
                <span>PATCH {buildInfo.patch}</span>
                <button className="build-shortcuts" onClick={openTestMode}>
                  Genvägar
                </button>
              </div>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ETT BORD. TUSEN BERÄTTELSER.</p>
                  <h1>Ditt nästa äventyr väntar.</h1>
                  <p>Stig in i en värld där dina val får betydelse.</p>
                </div>
                <div className="edition-tag">
                  <span>◆</span> GRÅSKOGENS KRÖNIKOR
                </div>
              </div>
              <section className="featured-campaign">
                <WorldArt />
                <div className="featured-shade" />
                <div className="featured-copy">
                  <div className="campaign-kicker">
                    <span className="badge">SPELBAR KAMPANJ</span>
                    <span>01 / 02</span>
                  </div>
                  <p className="eyebrow">{selected.subtitle}</p>
                  <h2>{selected.title}</h2>
                  <p className="campaign-description">{selected.description}</p>
                  <div className="campaign-meta">
                    <span>
                      <Users size={15} />
                      1–4 spelare
                    </span>
                    <span>
                      <Clock3 size={15} />
                      {c.campaignId === 'watchtower' ? '45–90' : '15–30'} min
                    </span>
                    <span>
                      <BookOpen size={15} />
                      Berättelsedrivet
                    </span>
                  </div>
                  <div className="featured-actions">
                    <button className="button primary" onClick={() => navigate('creation')}>
                      Börja ett nytt äventyr
                      <ArrowRight size={18} />
                    </button>
                    <button className="button glass" onClick={() => navigate('multiplayer')}>
                      <Users size={17} />
                      Spela tillsammans
                    </button>
                  </div>
                  <p className="featured-footnote">
                    <ShieldCheck size={13} />
                    Ingen spelledare behövs. Bara lite mod.
                  </p>
                </div>
              </section>
              <TestMode onStart={c.startTest} />
              {c.ready && c.auto && (
                <button className="continue-card panel" onClick={() => c.load(c.auto!)}>
                  <div className="continue-icon">
                    <Flame size={22} />
                  </div>
                  <div>
                    <span className="eyebrow">DIN SENASTE BERÄTTELSE</span>
                    <h3>Fortsätt med {c.auto.players[0].name}</h3>
                    <p>
                      {campaigns[c.auto.campaignId].title} · Nivå {c.auto.players[0].level} ·{' '}
                      {c.auto.journal.at(-1)?.title}
                    </p>
                  </div>
                  <span className="continue-arrow">
                    Återuppta
                    <ArrowRight size={18} />
                  </span>
                </button>
              )}
              <div className="section-heading compact-heading">
                <div>
                  <p className="eyebrow">VÄLJ DIN VÄG</p>
                  <h2>Berättelser att kliva in i</h2>
                </div>
                <span className="muted">Två ingångar till samma värld</span>
              </div>
              <div className="campaign-grid">
                {Object.values(campaigns).map((camp, i) => (
                  <button
                    className={`campaign-card panel ${c.campaignId === camp.id ? 'selected' : ''}`}
                    key={camp.id}
                    onClick={() => c.setCampaignId(camp.id)}
                  >
                    <div className={`campaign-symbol symbol-${i}`}>
                      {i === 0 ? (
                        <Flame size={35} strokeWidth={1.2} />
                      ) : (
                        <Sprout size={35} strokeWidth={1.2} />
                      )}
                    </div>
                    <div>
                      <span className="eyebrow">{camp.subtitle}</span>
                      <h3>{camp.title}</h3>
                      <p>
                        {i === 0
                          ? 'Hela resan, från Tre Lyktor till Skogsby.'
                          : 'Börja direkt i byn och följ den stulna lasten.'}
                      </p>
                    </div>
                    <ArrowUpRight size={19} />
                  </button>
                ))}
              </div>
              <div className="features-row">
                <div>
                  <ScrollText size={19} />
                  <span>
                    <strong>Dina val, din berättelse</strong>
                    <small>Förgreningar, hemligheter och allianser.</small>
                  </span>
                </div>
                <div>
                  <Swords size={19} />
                  <span>
                    <strong>Taktik före tur</strong>
                    <small>Positioner, klassförmågor och samarbete.</small>
                  </span>
                </div>
                <div>
                  <Save size={19} />
                  <span>
                    <strong>En värld att återvända till</strong>
                    <small>Spara din hjälte och fortsätt när du vill.</small>
                  </span>
                </div>
              </div>
            </div>
          )}
          {c.screen === 'creation' && (
            <CharacterCreator onBack={() => navigate('home')} onSubmit={c.start} />
          )}
          {c.screen === 'game' && c.game && (
            <GameView
              key={c.game.id}
              game={c.game}
              actorId={heroId}
              act={c.act}
              disabled={c.pending || (!!c.room && c.connection !== 'online')}
              onSave={() => setDialog('save')}
              onMenu={() => navigate('home')}
            />
          )}
          {c.screen === 'multiplayer' && <Multiplayer controller={c} />}
          {c.screen === 'characters' && (
            <div className="page-enter">
              <p className="eyebrow">HJÄLTAR SOM LÄMNAR SPÅR</p>
              <h1>Dina rollpersoner</h1>
              <p className="page-description">
                Dina senaste solohjältar och deras pågående berättelser sparas på den här enheten.
                Kontots multiplayerhjältar följer med sina sparade rum.
              </p>
              <div className="roster-grid">
                {c.roster.map((hero) => (
                  <div className="panel roster-card" key={hero.id}>
                    <div className="hero-emblem">
                      <Swords size={40} />
                    </div>
                    <span className="eyebrow">
                      NIVÅ {hero.level} · {hero.race}
                    </span>
                    <h2>{hero.name}</h2>
                    <p>
                      {hero.className} · {hero.talent}
                    </p>
                    <div className="muted">
                      {hero.hp}/{hero.maxHp} liv · {hero.xp} XP · {hero.gold} guld
                    </div>
                    <button
                      className="button full"
                      onClick={() => {
                        try {
                          const saves = (
                            JSON.parse(
                              localStorage.getItem('drakvalvet:roster') ?? '[]',
                            ) as unknown[]
                          ).map(parseSave);
                          const save = saves.find((s) => s.state.players[0].id === hero.id);
                          if (save) c.load(save.state);
                        } catch (e) {
                          c.report(e);
                        }
                      }}
                    >
                      Fortsätt berättelsen
                      <ArrowRight size={15} />
                    </button>
                  </div>
                ))}
                <button className="panel new-hero" onClick={() => navigate('creation')}>
                  <Swords size={35} />
                  <h3>En ny legend</h3>
                  <p>
                    Skapa en rollperson
                    <ArrowRight size={15} />
                  </p>
                </button>
              </div>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>DRAKVALVET</span>
          <p>En levande berättelse. Ett val i taget.</p>
          <span>◆</span>
        </footer>
      </div>
      {dialog === 'save' && <SaveDialog controller={c} onClose={() => setDialog(null)} />}
      {dialog === 'account' && <AccountDialog controller={c} onClose={() => setDialog(null)} />}
      {dialog === 'help' && (
        <Modal title="Att spela Drakvalvet" onClose={() => setDialog(null)}>
          <div className="guide">
            <h3>Berättelsen</h3>
            <p>
              Välj en kampanj och skapa en hjälte. Varje val kan ge utrustning, information eller
              förtroende. Allt sparas automatiskt i solospel.
            </p>
            <h3>Strid</h3>
            <p>
              Initiativ avgör turordningen. Välj en fiende och anfall, försvara dig eller använd din
              klassförmåga. Anfall och förmågor använder din handling; förflyttning inom din
              hastighet kan göras före den. Klassförmågor återställs inför nästa strid.
            </p>
            <p>
              Utan mätta avstånd skyddar framlinjen baklinjen mot närstrid. I strider med avstånd
              avgör räckvidd och fri sikt vad som kan anfallas. Varelser mellan skytt och mål kan ge
              Half Cover (+2 AC); du kan också flytta till terrängskydd. Totalt skydd blockerar
              avståndsanfall åt båda håll. Försvara ger fiendens anfall nackdel; Hjälp ger en
              kamrats nästa attack fördel.
            </p>
            <h3>Sällskap</h3>
            <p>
              Skapa ett rum och dela koden. Varje spelare väljer en rollperson. Värden startar när
              minst två är redo. Alla kan göra berättelseval; i strid agerar bara hjälten vars tur
              det är. Ett förlorat nätverk återansluts automatiskt.
            </p>
            <h3>Sparningar & hjältar</h3>
            <p>
              Manuella sparningar ersätter den valda platsen. Exportera JSON för en säkerhetskopia.
              Kontosparningar kan öppnas på en annan enhet. En exporterad multiplayerberättelse kan
              även spelas lokalt med växlande kontroll över sällskapet.
            </p>
            <p>
              Vid seger får fallna hjältar 1 liv. Vid nederlag kan du ladda en tidigare sparning.
              Nivå 2 nås vid 300 XP.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
