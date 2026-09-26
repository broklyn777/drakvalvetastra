/**
 * Ready-made level-1 heroes following D&D 2024 character creation: Standard Array
 * (15, 14, 13, 12, 10, 8) assigned for the class, then the background's +2/+1 and its Origin Feat.
 */
export const pregenData = {
  sigrun: {
    name: 'Sigrun Ljusbärare',
    race: 'human',
    class: 'paladin',
    talent: 'savage',
    background: 'Soldier',
    desc: 'Före detta soldat som svurit att skydda Gråskogens byar. Svärd, sköld och en fast blick.',
    // Standard Array STR 15, DEX 10, CON 13, INT 8, WIS 12, CHA 14; Soldier: STR +2, CON +1.
    scores: { str: 17, dex: 10, con: 14, int: 8, wis: 12, cha: 14 },
  },
  brodd: {
    name: 'Brodd Stenhjärta',
    race: 'dwarf',
    class: 'cleric',
    talent: 'supply',
    background: 'Hermit',
    desc: 'Eremit från bergen som lärt sig läka både sår och själar. Sällskapets helare.',
    // Standard Array STR 13, DEX 10, CON 14, INT 8, WIS 15, CHA 12; Hermit: WIS +2, CON +1.
    scores: { str: 13, dex: 10, con: 15, int: 8, wis: 17, cha: 12 },
  },
  pip: {
    name: 'Pip Snabbfot',
    race: 'halfling',
    class: 'thief',
    talent: 'keen',
    background: 'Criminal',
    desc: 'Ficktjuv från Kungsvägens marknader. Ser faran först och slår till där ingen tittar.',
    // Standard Array STR 8, DEX 15, CON 14, INT 13, WIS 12, CHA 10; Criminal: DEX +2, CON +1.
    scores: { str: 8, dex: 17, con: 15, int: 13, wis: 12, cha: 10 },
  },
  liria: {
    name: 'Liria Vindspår',
    race: 'elf',
    class: 'ranger',
    talent: 'savage',
    background: 'Soldier',
    desc: 'Gränsvakt som följt Gråskogens stigar i hundra år. Hennes pilar missar sällan.',
    // Standard Array STR 12, DEX 15, CON 13, INT 8, WIS 14, CHA 10; Soldier: DEX +2, CON +1.
    scores: { str: 12, dex: 17, con: 14, int: 8, wis: 14, cha: 10 },
  },
  solveig: {
    name: 'Solveig Glödsten',
    race: 'human',
    class: 'mage',
    talent: 'keen',
    background: 'Criminal',
    desc: 'Stal en trollkarls bok och lärde sig läsa den. Nu är elden hennes.',
    // Standard Array STR 8, DEX 13, CON 14, INT 15, WIS 12, CHA 10; Criminal: INT +2, CON +1.
    scores: { str: 8, dex: 13, con: 15, int: 17, wis: 12, cha: 10 },
  },
} as const;
export type PregenId = keyof typeof pregenData;
