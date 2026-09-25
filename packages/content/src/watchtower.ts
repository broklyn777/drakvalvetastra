import type { Choice, Scene, GameState, Character, EnemyDefinition } from '../../engine/src/types';
import { die } from '../../engine/src/random';
import { emit } from '../../engine/src/events';

/** Pure content factory. Effects may only be executed by the engine on a cloned state. */
export function watchtowerScenes(session: GameState, actor: string): Record<string, Scene> {
  const state = session.players.find((p) => p.id === actor) ?? session.players[0];
  const world = session.world;
  const partyHas = (prop: keyof Character) => session.players.some((p) => Boolean(p[prop]));
  // D&D Beyond Basic Rules (2014): Guard (CR 1/8) and Cultist (CR 1/8).
  const towerGuards = (): EnemyDefinition[] => [
    {
      name: 'Guard',
      hp: 11,
      maxHp: 11,
      ac: 16,
      attack: 3,
      dmg: [1, 6, 1],
      weapon: 'Spear',
      damageType: 'Stick',
      dex: 12,
      speed: 30,
    },
    {
      name: 'Cultist',
      hp: 9,
      maxHp: 9,
      ac: 12,
      attack: 3,
      dmg: [1, 6, 1],
      weapon: 'Scimitar',
      damageType: 'Hugg',
      dex: 12,
      speed: 30,
    },
  ];
  // D&D Beyond Basic Rules (2014): Skeleton (CR 1/4).
  const cryptSkeleton = (): EnemyDefinition => ({
    name: 'Skeleton',
    hp: 13,
    maxHp: 13,
    ac: 13,
    attack: 4,
    dmg: [1, 6, 2],
    weapon: 'Shortsword',
    damageType: 'Stick',
    weaknesses: ['Kross'],
    dex: 14,
    speed: 30,
  });
  const scenes: Record<string, Scene> = {
    roadIntro: {
      title: 'Vägen mot Gråskogen',
      text: () => {
        const multi = session.players.length > 1;
        return multi
          ? [
              'Tre dagar har gått sedan ni lämnade den trafikerade delen av Kungsvägen och vek av norrut mot Gråskogen.',
              'Sedan dess har gårdarna blivit färre, vägen smalare och träden tätare. Den sista milstolpen ni passerade var så vittrad att namnet inte längre gick att läsa.',
              'Kartan ni bär visar vägen mot <strong>Skogsby</strong>, den sista större bosättningen innan Gråskogen tar vid på allvar. Ni har ingen särskild anledning att dröja i trakten. Skogsby är bara nästa plats längs vägen.',
              'På det förra värdshuset sa man att vägen dit inte brukade vara farlig.',
              'Bara öde.',
              'Regnet har följt er sedan eftermiddagen och blivit kallare för varje timme. När mörkret börjar lägga sig mellan granarna ser ni till sist ett varmt ljus längre fram.',
              'Ett lågt värdshus ligger vid vägkanten. Ovanför dörren gungar en sliten träskylt i vinden. På den syns tre målade lyktor, blekta av många års regn och vinter.',
              '<strong>Tre Lyktor.</strong>',
              'Ni skyndar de sista stegen mot huset, mer för värmen än för något annat.',
              'Än så länge.',
            ]
          : [
              'Tre dagar har gått sedan du lämnade den trafikerade delen av Kungsvägen och vek av norrut mot Gråskogen.',
              'Sedan dess har gårdarna blivit färre, vägen smalare och träden tätare. Den sista milstolpen du passerade var så vittrad att namnet inte längre gick att läsa.',
              'Kartan i din ficka visar vägen mot <strong>Skogsby</strong>, den sista större bosättningen innan Gråskogen tar vid på allvar. Du har ingen särskild anledning att dröja i trakten. Skogsby är bara nästa plats längs vägen.',
              'På det förra värdshuset sa man att vägen dit inte brukade vara farlig.',
              'Bara öde.',
              'Regnet har följt dig sedan eftermiddagen och blivit kallare för varje timme. När mörkret börjar lägga sig mellan granarna ser du till sist ett varmt ljus längre fram.',
              'Ett lågt värdshus ligger vid vägkanten. Ovanför dörren gungar en sliten träskylt i vinden. På den syns tre målade lyktor, blekta av många års regn och vinter.',
              '<strong>Tre Lyktor.</strong>',
              'Du skyndar de sista stegen mot huset, mer för värmen än för något annat.',
              'Än så länge.',
            ];
      },
      choices: [['Gå in på värdshuset', 'inn']],
    },
    inn: {
      title: 'Värdshuset Tre Lyktor',
      text: () => {
        const multi = session.players.length > 1;
        return multi
          ? [
              'Värmen slår emot er när dörren öppnas. Det luktar vedrök, våt ull och mat från grytan över elden.',
              'Vid ett av borden sitter en äldre man i grå ullkappa. Framför honom ligger en karta med ett ensamt kryss där skogen blir som tätast.',
              '“På väg mot Skogsby?” frågar han. Sedan pekar han på krysset. “Vakttornet. Tre jägare gick dit för fyra dagar sedan. Ingen kom tillbaka. I natt såg vi ljus mellan träden.”',
              'Innan ni hinner svara hörs snabba, ojämna hovslag ute i mörkret.',
              'Ett kort rop — sedan ett tungt slag mot ytterdörren.',
            ]
          : [
              'Värmen slår emot dig när dörren öppnas. Det luktar vedrök, våt ull och mat från grytan över elden.',
              'Vid ett av borden sitter en äldre man i grå ullkappa. Framför honom ligger en karta med ett ensamt kryss där skogen blir som tätast.',
              '“På väg mot Skogsby?” frågar han. Sedan pekar han på krysset. “Vakttornet. Tre jägare gick dit för fyra dagar sedan. Ingen kom tillbaka. I natt såg vi ljus mellan träden.”',
              'Innan du hinner svara hörs snabba, ojämna hovslag ute i mörkret.',
              'Ett kort rop — sedan ett tungt slag mot ytterdörren.',
            ];
      },
      choices: [
        ['Dra vapnet och gå mot dörren', 'door'],
        ['Gå till fönstret och spana först', 'window'],
        ['Fråga mannen vad han inte berättar', 'oldman'],
      ],
    },
    window: {
      title: 'Genom regnet',
      text: [
        'Du drar undan gardinen en handsbredd. På gårdsplanen står en sadellös häst, täckt av skum. Någon ligger hopkrupen bredvid brunnen.',
        'Längre bort, precis där lyktskenet dör, rör sig två mörka gestalter mot värdshuset. Den ene har ett armborst.',
        'Du har några sekunders försprång.',
      ],
      effect: () => {
        state.warned = true;
      },
      choices: [
        ['Varna alla och ta position vid dörren', 'door'],
        ['Smyg ut genom köket och försök flankera dem', 'ambush'],
      ],
    },
    oldman: {
      title: 'Det gamla sigillet',
      text: [
        'Mannen ser mot dörren, sedan på dig. Till sist drar han fram något ur rocken: en liten bronsskiva märkt med en drake vars vingar bildar en cirkel.',
        '“Min far hittade den i tornet när jag var barn. Han sade att tornet inte byggdes för att vaka över vägen. Det byggdes för att vaka över något under marken.”',
        'Han skjuter sigillet över bordet. “Om du går dit — ta detta.”',
      ],
      effect: () => {
        state.sigil = true;
      },
      choices: [['Ta sigillet och möt hotet utanför', 'door']],
    },
    door: {
      title: 'Blod på tröskeln',
      text: [
        'Dörren slås upp. En ung ryttare faller in över tröskeln med ena handen pressad mot sidan.',
        'Bakom honom kommer två vägrövare ur regnet. Den främste höjer sin sabel vid dörren. Armborstskytten stannar längre bort på gården och siktar.',
        'Det finns ingen tid kvar för ord.',
      ],
      combat: {
        enemies: [
          {
            name: 'Bandit',
            hp: 11,
            maxHp: 11,
            ac: 12,
            attack: 3,
            dmg: [1, 6, 1],
            weapon: 'Scimitar',
            damageType: 'Hugg',
            position: 'fram',
            dex: 12,
            speed: 30,
            startDistance: 5,
            preferredAttack: 'melee',
            attacks: [
              {
                name: 'Scimitar',
                kind: 'melee',
                attack: 3,
                dmg: [1, 6, 1],
                damageType: 'Hugg',
                reach: 5,
              },
              {
                name: 'Light Crossbow',
                kind: 'ranged',
                attack: 3,
                dmg: [1, 8, 1],
                damageType: 'Stick',
                normalRange: 80,
                longRange: 320,
              },
            ],
          },
          {
            name: 'Bandit (armborstskytt)',
            hp: 11,
            maxHp: 11,
            ac: 12,
            attack: 3,
            dmg: [1, 8, 1],
            weapon: 'Light Crossbow',
            damageType: 'Stick',
            position: 'bak',
            dex: 12,
            speed: 30,
            startDistance: 50,
            preferredAttack: 'ranged',
            attacks: [
              {
                name: 'Scimitar',
                kind: 'melee',
                attack: 3,
                dmg: [1, 6, 1],
                damageType: 'Hugg',
                reach: 5,
              },
              {
                name: 'Light Crossbow',
                kind: 'ranged',
                attack: 3,
                dmg: [1, 8, 1],
                damageType: 'Stick',
                normalRange: 80,
                longRange: 320,
              },
            ],
          },
        ],
        onWin: 'afterBandits',
        xp: 50,
        fixedEnemies: true,
        usesDistance: true,
      },
    },
    ambush: {
      title: 'Bakom vedboden',
      text: [
        'Du glider ut genom köksdörren. Regnet döljer dina steg. När rånarna når gårdsplanen är du redan bakom dem.',
        'Armborstskytten hinner inte få upp armborstet innan du rusar fram. Han griper efter sabeln.',
      ],
      effect: () => {
        state.warned = true;
      },
      combat: {
        enemies: [
          {
            name: 'Bandit',
            hp: 11,
            maxHp: 11,
            ac: 12,
            attack: 3,
            dmg: [1, 6, 1],
            weapon: 'Scimitar',
            damageType: 'Hugg',
            position: 'fram',
            dex: 12,
            speed: 30,
            startDistance: 5,
            preferredAttack: 'melee',
            attacks: [
              {
                name: 'Scimitar',
                kind: 'melee',
                attack: 3,
                dmg: [1, 6, 1],
                damageType: 'Hugg',
                reach: 5,
              },
              {
                name: 'Light Crossbow',
                kind: 'ranged',
                attack: 3,
                dmg: [1, 8, 1],
                damageType: 'Stick',
                normalRange: 80,
                longRange: 320,
              },
            ],
          },
          {
            name: 'Bandit (armborstskytt)',
            hp: 11,
            maxHp: 11,
            ac: 12,
            attack: 3,
            dmg: [1, 6, 1],
            weapon: 'Scimitar / Light Crossbow',
            damageType: 'Hugg',
            position: 'fram',
            dex: 12,
            speed: 30,
            startDistance: 5,
            preferredAttack: 'ranged',
            attacks: [
              {
                name: 'Scimitar',
                kind: 'melee',
                attack: 3,
                dmg: [1, 6, 1],
                damageType: 'Hugg',
                reach: 5,
              },
              {
                name: 'Light Crossbow',
                kind: 'ranged',
                attack: 3,
                dmg: [1, 8, 1],
                damageType: 'Stick',
                normalRange: 80,
                longRange: 320,
              },
            ],
          },
        ],
        onWin: 'afterBandits',
        xp: 50,
        surprise: 'enemies',
        fixedEnemies: true,
        usesDistance: true,
      },
    },
    afterBandits: {
      title: 'En väg in i skogen',
      text: [
        'När den sista rövaren faller blir gården tyst igen, bortsett från regnet.',
        'På en av kropparna hittar du ett grovt järnmynt märkt med samma draksymbol som på den gamle mannens sigill. Ryttaren på golvet lyckas få fram några ord:',
        '“De har tagit de andra… till tornet.”',
        'Bland rövarnas saker ligger en liten sköld, en flaska läkande brygd och en handfull mynt.',
      ],
      effect: () => {
        state.gold += 11;
        state.potions += 1;
        if (!state.shield) {
          state.shield = true;
          state.ac += 2;
        }
        state.towerKey = true;
      },
      choices: [
        ['Ge dig av mot vakttornet direkt', 'forest'],
        ['Vila kort och bind om såren — återfå 8 HP', 'rest'],
      ],
    },
    rest: {
      title: 'En kort vila',
      text: () => {
        return [
          'Du sitter nära elden medan värdshusvärden tvättar blodet från golvet. Efter en halvtimme har skakningen i händerna lagt sig.',
          `Den korta vilan är avslutad. Du har ${state.hp}/${state.maxHp} HP.`,
          'När du går ut har regnet nästan upphört. Molnen ligger lågt över Gråskogen.',
        ];
      },
      effect: () => {
        if (!state.rested) {
          state.hp = Math.min(state.maxHp, state.hp + 8);
          state.rested = true;
        }
      },
      choices: [['Följ vägen mot tornet', 'forest']],
    },
    forest: {
      title: 'Gråskogen',
      text: [
        'Stigen slingrar sig mellan höga granar och svarta klippor. Ju längre in du går desto tystare blir skogen.',
        'Efter en knapp timme hittar du resterna av en lägerplats. En trasig ryggsäck ligger intill eldstaden. Bredvid den finns färska spår som leder bort från stigen.',
        'Långt fram genom träden skymtar du toppen av ett sönderfallet stentorn.',
      ],
      choices: [
        ['Undersök den övergivna lägerplatsen', 'camp'],
        ['Följ spåren bort från stigen', 'tracks'],
        ['Gå direkt mot tornet', 'towerExterior'],
      ],
    },
    camp: {
      title: 'Jägarnas läger',
      text: [
        'Ryggsäcken tillhör en av de saknade jägarna. Du hittar ett rep, torra fnösken och några medicinska örter.',
        'Under en filt ligger också ett sönderbrutet armborst. Någon har gått rakt genom lägret och slagit sönder det.',
      ],
      effect: () => {
        state.rope = true;
        state.herbs += 1;
        state.torch = true;
      },
      choices: [['Fortsätt mot tornet', 'towerExterior']],
    },
    tracks: {
      title: 'Spår i mossan',
      text: [
        'Spåren leder till en smal ravin. Där hittar du en av jägarna, levande men svårt skadad.',
        'Han berättar att rövarna arbetar åt någon de kallar Väktaren. Under tornet finns en äldre ruin, och rövarna har försökt öppna en stendörr där nere.',
        '“De väckte något”, viskar han. “Det följer ljud.”',
        'Innan du går visar han en dold stig som leder till tornets baksida.',
      ],
      effect: () => {
        state.bossWeakened = true;
      },
      choices: [['Ta den dolda stigen till tornet', 'towerExterior']],
    },
    towerExterior: {
      title: 'Det fallna vakttornet',
      text: [
        'Tornet står på en bergsrygg som ett avbrutet finger mot himlen. Murarna är täckta av mossa och den övre våningen har rasat in.',
        'En vakt och en kultist håller till vid huvudingången. På baksidan syns en spricka i muren, högt över marken.',
        'Någonstans under dina fötter hörs ett dovt, regelbundet slag.',
      ],
      choices: () => {
        const arr: Choice[] = [['Gå mot huvudingången', 'towerFight']];
        if (partyHas('rope'))
          arr.push([
            'Använd repet och ta dig in genom sprickan',
            'towerSneak',
            { skill: 'Athletics', attributes: ['str'], dc: 10, fail: 'towerSneakFail' },
          ]);
        if (partyHas('sigil'))
          arr.push([
            'Visa sigillet öppet och försök bluffa dig förbi',
            'towerBluff',
            { skill: 'Deception', attributes: ['cha'], dc: 12, fail: 'towerBluffFail' },
          ]);
        return arr;
      },
    },
    towerFight: {
      title: 'Vakten vid tornet',
      text: [
        'Vid porten drar en vakt i ringbrynjeskjorta fram sitt spjut. Bredvid honom höjer en kultist sin sabel.',
      ],
      combat: {
        enemies: towerGuards(),
        onWin: 'towerHall',
        xp: 50,
      },
    },
    towerSneak: {
      title: 'Genom muren',
      text: [
        'Repet håller. Du tar dig upp längs den våta stenen och pressar dig genom sprickan.',
        'Du landar på ett mörkt loft ovanför vakten och kultisten och undviker striden helt. Där hittar du en kista som rövarna ännu inte brutit upp.',
        'I den ligger ett välbalanserat gammalt svärd.',
      ],
      effect: () => {
        state.weapon = 'Vaktsvärd (+3 skada)';
        state.damage = [1, 8, 3];
        state.damageType = 'Hugg';
      },
      choices: [['Gå ner i tornets inre', 'towerHall']],
    },
    towerBluff: {
      title: 'Drakens tecken',
      text: [
        'När vakten och kultisten ser sigillet förändras deras ansikten. Kultisten gör genast en gest mot bröstet.',
        '“Vi trodde att budbäraren redan var nere.”',
        'Du säger ingenting. Efter några spänt tysta sekunder kliver de åt sidan.',
        'Bluffen håller — åtminstone tills någon ställer en fråga.',
      ],
      choices: [['Gå in i tornet', 'towerHall']],
    },
    towerSneakFail: {
      title: 'Stenen som gav vika',
      text: () => [
        'Halvvägs upp lossnar en sten under din fot. Repet bränner i handflatorna när du glider ner längs muren och slår i marken.',
        `Du har ${state.hp}/${state.maxHp} HP.`,
        'Ljudet ekar mot tornets väggar. Innan du hunnit resa dig står vakten och kultisten över dig med dragna vapen.',
      ],
      effect: () => {
        const before = state.hp;
        state.hp = Math.max(1, state.hp - die(session, 4));
        emit(
          session,
          'damage',
          `${state.name} faller och tar ${before - state.hp} skada.`,
          'Fall: 1d4 damage, men aldrig under 1 HP.',
        );
      },
      combat: {
        enemies: towerGuards(),
        onWin: 'towerHall',
        xp: 50,
        surprise: 'players',
      },
    },
    towerBluffFail: {
      title: 'Fel svar',
      text: [
        'Vakten och kultisten ser sigillet och tvekar. Sedan lutar sig kultisten fram.',
        '“Vad är lösenordet för i kväll?”',
        'Du svarar för snabbt. Hans blick hårdnar, och spjutet sänks mot ditt bröst.',
      ],
      combat: {
        enemies: towerGuards(),
        onWin: 'towerHall',
        xp: 50,
      },
    },
    towerHall: {
      title: 'Under tornet',
      text: [
        'En spiraltrappa leder ner under marknivå. Luften blir kallare för varje steg.',
        'Längst ner står en järndörr på glänt. Bakom den ligger en korridor byggd av mycket äldre sten än tornet ovanför.',
        'På golvet syns blodspår. Från mörkret hörs ett skrapande ljud.',
      ],
      choices: [
        ['Tänd ljus och gå försiktigt framåt', 'cryptBeast'],
        ['Ropa ut i mörkret', 'cryptBeastLoud'],
      ],
    },
    cryptBeast: {
      title: 'Skelettet i kryptan',
      text: [
        'Du går långsamt och håller andan. Då rör sig något mellan pelarna.',
        'Ett skelett i rostiga rustningsrester griper ett kortsvärd. Det vrider skallen mot minsta ljud.',
        partyHas('bossWeakened')
          ? 'Jägarens varning räddar dig: du sparkar undan en lös sten åt motsatt håll. Skelettet vänder sig efter ljudet och du får ett ögonblicks försprång.'
          : 'Det hör din stövel skrapa mot stenen och kommer mot dig.',
      ],
      combat: {
        enemies: [cryptSkeleton()],
        onWin: 'sealedDoor',
        xp: 50,
        surprise: partyHas('bossWeakened') ? 'enemies' : undefined,
      },
    },
    cryptBeastLoud: {
      title: 'Ett misstag i mörkret',
      text: [
        'Ditt rop ekar genom korridoren.',
        'Svaret är ett skrapande från mörkret. Ett skelett med draget kortsvärd hittar dig bland pelarna.',
      ],
      combat: {
        enemies: [cryptSkeleton()],
        onWin: 'sealedDoor',
        xp: 50,
        surprise: 'players',
      },
    },
    sealedDoor: {
      title: 'Stendörren',
      text: [
        'Bakom kryptans sista pelare står stendörren som jägaren beskrev. Draksymbolen finns inhuggen mitt på dörren.',
        state.sigil
          ? 'När du håller bronssigillet mot stenen hörs ett djupt klick. Dörren öppnas några centimeter av sig själv.'
          : 'Mitt i symbolen finns en rund fördjupning. Någon har försökt bryta upp den med järnverktyg.',
        'Bakom dörren glimmar ett blåvitt sken.',
      ],
      choices: () => {
        const a: Choice[] = [];
        if (partyHas('sigil')) a.push(['Använd sigillet och öppna dörren', 'vault']);
        if (partyHas('towerKey')) a.push(['Försök använda järnmyntet från rövarna', 'vaultRough']);
        a.push(['Lämna platsen tills vidare', 'endingLeave']);
        return a;
      },
    },
    vault: {
      title: 'Drakvalvet',
      effect: () => {
        world.openedVault = true;
      },
      text: [
        'Stendörren glider upp.',
        'Bakom den finns inte en gravkammare utan en enorm sal som fortsätter bortom ljusets räckvidd. Pelarna är formade som hopvikta drakvingar.',
        'På en piedestal svävar en mörk kristall några centimeter ovanför stenen.',
        'Och långt inne i valvet öppnas två glödande ögon.',
        'Det du har hittat är större än ett försvunnet jaktlag. Detta var bara början.',
      ],
      choices: [['Återvänd mot Skogsby', 'skogsbyReturn']],
    },
    vaultRough: {
      title: 'Den brutna förseglingen',
      effect: () => {
        world.openedVault = true;
        world.brokeSeal = true;
      },
      text: [
        'Järnmyntet passar inte riktigt, men när du pressar det mot fördjupningen svarar mekanismen.',
        'Stenen spricker. Dörren rycker upp med ett öronbedövande brak.',
        'Bakom den ligger en enorm underjordisk sal. På en piedestal svävar en mörk kristall.',
        'Något rör sig långt där inne.',
        'Du har öppnat valvet — men inte på det sätt dess byggare avsåg.',
      ],
      choices: [['Återvänd mot Skogsby', 'skogsbyReturn']],
    },
    endingLeave: {
      title: 'Inte ännu',
      effect: () => {
        world.leftSealed = true;
      },
      text: [
        'Du bestämmer dig för att inte öppna dörren utan bättre förberedelser.',
        'På vägen tillbaka genom skogen vet du ändå att du kommer återvända.',
        'Vad som än finns under tornet har väntat länge. Och nu vet det att någon har hittat vägen dit.',
      ],
      choices: [['Återvänd mot Skogsby', 'skogsbyReturn']],
    },
    skogsbyReturn: {
      title: 'Kapitel 1 – Skogsby',
      text: () => [
        'När Gråskogens sista granar glesnar ligger morgondimman fortfarande över fälten. Framför er reser sig Skogsbys låga träpalissad och de första taken syns bakom den.',
        'Efter tornets mörker känns ljudet av en smedshammare, en skällande hund och människor på väg till dagens arbete nästan overkligt vanligt.',
        world.brokeSeal
          ? 'Men minnet av den spruckna förseglingen följer er. Något under tornet vaknade när stenen brast.'
          : world.openedVault
            ? 'Bakom er ligger valvet och de glödande ögonen i mörkret. Ni vet ännu inte vad ni såg.'
            : 'Bakom er ligger den förseglade dörren fortfarande stängd. Frågan är hur länge den får förbli så.',
        'Vid vägskälet utanför byn väntar en kvinna i grönbrun jaktkappa. Hon har en långbåge över axeln och känner igen utrustningen från de försvunna jägarna innan hon känner igen er.',
      ],
      choices: [['Möt jägaren vid vägskälet', 'miraMeet']],
    },
    miraMeet: {
      title: 'Mira Hök',
      text: [
        '“Mira Hök”, säger hon och lägger två fingrar mot pannan till hälsning. “De tre som gick till tornet var mina. Jag har väntat på någon som kunde berätta vad som hände.”',
        'Blicken stannar vid blodfläckarna, järnmyntet och det ni bär med er från tornet. Hon ställer inga fler frågor. Hon väntar bara på ert svar.',
      ],
      choices: [
        ['Berätta allt – även om ruinen och det ni fann under tornet', 'miraTruth'],
        ['Berätta om jägarna men håll valvet och sigillet för er själva', 'miraGuarded'],
        ['Fråga först vad Mira själv vet om jägarna och tornet', 'miraHunters'],
      ],
    },
    miraTruth: {
      title: 'Ett förtroende',
      effect: () => {
        world.miraTrust = 2;
        world.miraTrail = true;
        state.herbs += 1;
      },
      text: [
        'Ni berättar från början till slut. Mira avbryter inte ens när ni nämner draksymbolen och den gamla dörren under tornet.',
        'När ni är klara räcker hon över ett knippe läkande skogsörter. “Då står vi på samma sida tills jag får anledning att tro något annat.”',
        'Hon berättar också att hon sett främmande stövelspår längs den östra skogsstigen de senaste dagarna — män som försökt undvika både byn och Kungsvägen.',
      ],
      choices: [['Gå vidare in i Skogsby', 'smithMeet']],
    },
    miraGuarded: {
      title: 'Halva sanningen',
      effect: () => {
        world.miraTrust = 0;
      },
      text: [
        'Ni berättar om rövarna och jägarna men lämnar ruinen därhän. Mira lyssnar och nickar långsamt.',
        '“Det där var sanningen”, säger hon till sist. “Men inte hela sanningen.” Hon pressar er inte vidare.',
        'När hon går mot jägarnas hus vet ni att hon kommer hjälpa er om byn hotas — men hon har ännu ingen anledning att anförtro er sina egna misstankar.',
      ],
      choices: [['Gå vidare in i Skogsby', 'smithMeet']],
    },
    miraHunters: {
      title: 'Spår som inte hör hemma där',
      effect: () => {
        world.miraTrust = 1;
        world.miraTrail = true;
      },
      text: [
        'I stället för att börja med er egen berättelse frågar ni vad hon vet. Mira uppskattar frågan mer än hon visar.',
        'Två dagar före försvinnandet såg jägarna en grupp främmande män röra sig längs en gammal skogsstig öster om tornet. De bar inga färger och köpte ingen proviant i byn.',
        '“Nu berättar ni er del”, säger hon. Ni ger henne det viktigaste. Inte allt — men tillräckligt för att hon ska lova att hjälpa er tyda spåren om de dyker upp igen.',
      ],
      choices: [['Gå vidare in i Skogsby', 'smithMeet']],
    },
    smithMeet: {
      title: 'Smedjan vid torget',
      text: () => [
        'På torget slår smeden Runa Vargeld igen luckan till sitt kollager med foten och muttrar åt en tom vagnsplats bredvid smedjan.',
        '“Två leveranser på tre veckor”, säger hon när hon ser er blick. “Den ena sen. Den andra kom aldrig. Jag kan smida, men jag kan inte trolla fram järn.”',
        partyHas('sigil')
          ? 'När draksigillet skymtar bland era saker stannar hammaren i hennes hand. “Det där är äldre än något jag har i smedjan.”'
          : 'När järnmyntet från rövarna hamnar i hennes hand väger hon det mot tummen och rynkar pannan. “Dåligt järn. Men märket är gjort med omsorg.”',
      ],
      choices: [
        ['Låt Runa undersöka myntet och sigillet ordentligt', 'smithInspect'],
        ['Fråga om de försvunna järnleveranserna', 'smithDeliveries'],
        ['Erbjud er att hjälpa om nästa leverans också uteblir', 'smithFavor'],
      ],
    },
    smithInspect: {
      title: 'Metall som inte borde spricka',
      effect: () => {
        world.smithTrust = 2;
        world.smithMetalClue = true;
      },
      text: [
        'Runa skrapar järnmyntets kant mot en fil. Små mörka flagor lossnar på ett sätt som får henne att svära lågt.',
        '“Det här har inte bara rostat. Något har gjort järnet sprött inifrån.” Hon tittar sedan på drakmärket. “Och jag har sett samma märke på en gammal lastförteckning från bergen.”',
        'Hon lovar att leta fram förteckningen tills ni återkommer.',
      ],
      choices: [['Sök upp den gamle mannen från Tre Lyktor', 'edricMeet']],
    },
    smithDeliveries: {
      title: 'Vagnar som aldrig kom fram',
      effect: () => {
        world.smithTrust = 1;
        world.smithMetalClue = true;
      },
      text: [
        'Runa plockar fram en kolsvart tavla med kritstreck. Två järnleveranser saknas. Båda skulle ha kommit norrifrån via samma sträcka av Kungsvägen.',
        '“Banditer tar pengar, mat och hästar”, säger hon. “Men någon har börjat ta råjärn och verktygsstål. Det är ett märkligt byte om man bara är hungrig.”',
        'Hon visar er märket som användes på följesedlarna. Det påminner obehagligt mycket om symbolen från tornet.',
      ],
      choices: [['Sök upp den gamle mannen från Tre Lyktor', 'edricMeet']],
    },
    smithFavor: {
      title: 'Ett löfte vid ässjan',
      effect: () => {
        world.smithTrust = 2;
        world.smithFavor = true;
      },
      text: [
        'Runa skrattar först åt erbjudandet, men när hon märker att ni menar allvar blir hon tystare.',
        '“Hitta min nästa vagn om den försvinner och jag står i skuld till er. En riktig skuld — inte en gratis hästsko.”',
        'Hon berättar att nästa leverans väntas från norr inom ett dygn. För första gången får den tomma vagnsplatsen bredvid smedjan en betydelse.',
      ],
      choices: [['Sök upp den gamle mannen från Tre Lyktor', 'edricMeet']],
    },
    edricMeet: {
      title: 'Edric från Tre Lyktor',
      text: () => [
        'Ni hittar den gamle mannen från värdshuset på en bänk bakom det lilla kapellet. I dagsljus ser han äldre ut än han gjorde framför elden.',
        '“Edric”, säger han innan ni hinner fråga efter hans namn. “Och jag antar att ni inte kom hit för att tacka mig för sigillet.”',
        world.brokeSeal
          ? 'När ni berättar att förseglingen brast försvinner färgen ur hans ansikte.'
          : world.openedVault
            ? 'När han förstår att dörren faktiskt öppnades sluter han ögonen ett ögonblick.'
            : 'När han hör att ni lämnade dörren stängd sjunker hans axlar, nästan omärkligt.',
        'Han vet mer. Den här gången är frågan hur ni tänker få honom att tala.',
      ],
      choices: () => {
        const base: Choice[] = [
          ['Säg lugnt att ni behöver sanningen, inte fler gåtor', 'edricOpen'],
          ['Pressa honom: Du visste vad som fanns under tornet', 'edricConfront'],
        ];
        if (world.openedVault || world.leftSealed)
          base.push([
            world.leftSealed
              ? 'Berätta varför ni valde att lämna förseglingen stängd'
              : 'Beskriv ögonen och den mörka kristallen i valvet',
            'edricVault',
          ]);
        return base;
      },
    },
    edricOpen: {
      title: 'Väktarnas namn',
      effect: () => {
        world.edricTrust = 2;
        world.keeperLore = true;
      },
      text: [
        'Edric studerar er länge och nickar sedan. “Rättvist.”',
        'Han berättar att draksymbolen tillhörde en gammal orden som kallades Väktarna. De bevakade inte skatter. De bevakade platser som aldrig fick öppnas utan rätt sigill och rätt kunskap.',
        '“Orden finns inte längre som den en gång gjorde”, säger han. “Men människor använder fortfarande dess namn.” Han lovar att visa er mer när han vet vilka som följt efter er från tornet.',
      ],
      choices: [['Låt kvällen falla över Skogsby', 'villageEvening']],
    },
    edricConfront: {
      title: 'Ord under press',
      effect: () => {
        world.edricTrust = 0;
        world.keeperLore = true;
      },
      text: [
        '“Ja”, säger Edric till slut. “Jag visste att det fanns något under tornet. Nej, jag visste inte vad som fortfarande levde där.”',
        'Han ger er ett namn: Väktarna. Mer än så vägrar han säga medan ilskan fortfarande ligger mellan er.',
        'Ni får sanningen ni krävde — men inte hans förtroende.',
      ],
      choices: [['Låt kvällen falla över Skogsby', 'villageEvening']],
    },
    edricVault: {
      title: 'Det som väcktes under stenen',
      effect: () => {
        world.edricTrust = 3;
        world.keeperLore = true;
        world.edricMap = true;
      },
      text: () => [
        world.leftSealed
          ? 'När ni förklarar att ni lämnade förseglingen orörd nickar Edric med en lättnad han inte försöker dölja.'
          : 'När ni beskriver kristallen och de glödande ögonen blir Edric alldeles stilla.',
        'Han tar fram ett vikt pergament ur kappans innerficka. På det syns Gråskogen, Stormbergen och tre bleknade märken som bildar en triangel runt området.',
        '“Min far kallade dem förseglingar”, säger han. “Jag trodde att kartan bara var en varning. Nu tror jag att den är en vägvisare.”',
        'Ni får behålla en avritning. Edric ber er att inte visa den för någon ni inte litar på.',
      ],
      choices: [['Låt kvällen falla över Skogsby', 'villageEvening']],
    },
    villageEvening: {
      title: 'En kväll i Skogsby',
      text: () => [
        'För första gången sedan Tre Lyktor får ni några timmar utan dragna vapen. Eldarna tänds bakom fönstren och doften av bröd och vedrök fyller torget.',
        world.miraTrust >= 2
          ? 'Mira lämnar ett meddelande: om ni behöver följa någon genom Gråskogen kommer hon.'
          : world.miraTrail
            ? 'Mira har markerat den östra skogsstigen på en enkel karta åt er.'
            : 'Mira håller avstånd. Hon har inte glömt att ni undanhöll något.',
        world.smithFavor
          ? 'Runa påminner om sitt löfte: hjälp henne med nästa försvunna leverans och hon kommer återgälda tjänsten.'
          : world.smithMetalClue
            ? 'Runas ord om det spröda järnet ligger kvar i tankarna. Det verkar vara mer än vanlig dålig malm.'
            : 'Från smedjan hörs arbete långt efter mörkrets inbrott.',
        world.edricTrust >= 2
          ? 'Edric sitter ensam vid Tre Lyktors eld. Nu vet ni åtminstone att ordet Väktarna betyder något verkligt.'
          : 'Edric har gett er ett namn — Väktarna — men knappast hela sanningen.',
      ],
      choices: [
        ['Sitt kvar på värdshuset och lyssna på byns rykten', 'villageRumors'],
        ['Gå tidigt till sängs och vila inför morgondagen', 'wagonArrival'],
      ],
    },
    villageRumors: {
      title: 'Rykten vid elden',
      effect: () => {
        world.villageRumors = true;
      },
      text: [
        'Ni stannar kvar när kvällsmaten dukas undan. Samtalen blir friare efter den andra kannan öl.',
        'En körkarl svär över stigande metallpriser. En bonde berättar om ljus mellan träden norr om vägen. Någon annan påstår att män i mörka kappor betalat silver för gamla kartor och rostiga reliker.',
        'Inget av det bevisar något. Tillsammans låter det mindre som otur och mer som ett mönster.',
      ],
      choices: [['Gå till vila', 'wagonArrival']],
    },
    wagonArrival: {
      title: 'Vagnen som saknar sin last',
      text: () => [
        'Nästa morgon bryts lugnet av rop från norra porten. En ensam vagn rullar in på tre hela hjul och ett som nästan slitits loss från axeln. Hästarna är vita av skum.',
        'Kusken ligger framstupa över kuskbocken. Flaket är sönderslaget och genomsökt. Rep har skurits av och i dammet syns den ljusa rektangeln efter en tung kista som inte längre finns där.',
        world.smithFavor || world.smithMetalClue
          ? 'Runa kommer springande från smedjan och stannar tvärt. “Det där är min leverans.”'
          : 'Runa kommer springande från smedjan. Först då förstår ni att vagnen skulle till hennes smedja.',
        world.villageRumors
          ? 'Bland byborna hör ni samma ord som kvällen innan: ännu en vagn, ännu en last, samma väg norrifrån.'
          : 'Folk samlas runt vagnen. Ingen verkar ännu förstå varför någon lämnat mat och mynt men tagit järnet — och en enda låst kista.',
        'På vagnens sidobräda har någon ristat en drake vars vingar bildar en cirkel.',
      ],
      choices: () => {
        const c: Choice[] = [['Undersök vagnen och den plats där kistan stod', 'wagonSearch']];
        if (world.miraTrail) c.push(['Hämta Mira innan spåren kallnar', 'wagonMira']);
        if (world.edricTrust >= 2) c.push(['Hämta Edric och visa honom drakmärket', 'wagonEdric']);
        return c;
      },
    },
    wagonSearch: {
      title: 'Under kuskbocken',
      effect: () => {
        world.wagonClue = 'letter';
      },
      text: [
        'Ni går igenom vagnen innan alltför många händer hinner röra den. Maten finns kvar. Myntpåsen finns kvar. Angriparna visste vad de ville ha.',
        'Under kuskbocken hittar ni ett tunt, vaxförseglat brev adresserat till en lärd i Stenbro. Kistan beskrivs bara som: ‘fynd från den norra utgrävningen — får ej öppnas under färd’.',
      ],
      choices: [['Fortsättning följer i nästa del av Kapitel 1', 'ending']],
    },
    wagonMira: {
      title: 'Spår österut',
      effect: () => {
        world.wagonClue = 'trail';
      },
      text: [
        'Mira behöver bara några ögonblick. Hon följer hjulspåren ut genom porten, går ner på knä och pekar på tre olika stövelavtryck.',
        '“De tog kistan från vagnen här ute och bar den till hästar.” Hon tittar mot skogsbrynet. “Sedan vek de av österut. Samma gamla stig som jag berättade om.”',
        'För att ni vann hennes förtroende tidigare har ni nu ett spår innan regn och trafik hinner förstöra det.',
      ],
      choices: [['Fortsättning följer i nästa del av Kapitel 1', 'ending']],
    },
    wagonEdric: {
      title: 'Ett märke som borde vara dött',
      effect: () => {
        world.wagonClue = 'keepers';
      },
      text: [
        'Edric blir blek när han ser ristningen. Han stryker med tummen över linjerna och skakar på huvudet.',
        '“Det här är inte en kopia gjord av en rövare. Någon känner Väktarnas gamla tecken.” Han ser mot Kungsvägen. “Och den personen ville att vi skulle veta vem som tog kistan.”',
        'Eftersom ni fick Edric att lita på er säger han mer än han annars skulle ha gjort: kistan måste till Stenbro innan den som stal den hinner öppna den.',
      ],
      choices: [['Fortsättning följer i nästa del av Kapitel 1', 'ending']],
    },
    ending: {
      title: 'Kapitel 1 har börjat',
      text: () => [
        'Prologen är avslutad och Skogsby är nu en del av den spelbara berättelsen.',
        world.wagonClue === 'trail'
          ? 'Ni avslutar denna version med ett färskt spår efter den stulna kistan.'
          : world.wagonClue === 'keepers'
            ? 'Ni avslutar denna version med Edric som allierad och en tydligare koppling till Väktarna.'
            : 'Ni avslutar denna version med det förseglade brevet till Stenbro i handen.',
        'Mötena med Mira, Runa och Edric sparar olika storykonsekvenser och öppnar olika val vid vagnen.',
      ],
      choices: [['Spela om från början', 'restart']],
    },
  };
  return scenes;
}

export const storyXp = {
  oldman: { xp: 20, reason: 'Ni avslöjade det gamla sigillets betydelse.' },
  tracks: { xp: 25, reason: 'Ni fann den saknade jägaren och lärde er mer om Väktaren.' },
  towerSneak: { xp: 35, reason: 'Ni tog er förbi tornvakterna utan strid.' },
  towerBluff: { xp: 35, reason: 'Ni lurade tornvakterna och undvek striden.' },
  vault: { xp: 50, reason: 'Ni upptäckte Drakvalvet.' },
  vaultRough: { xp: 50, reason: 'Ni upptäckte Drakvalvet.' },
};
