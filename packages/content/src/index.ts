import type { Campaign } from '../../engine/src/types';
import { watchtowerScenes, storyXp } from './watchtower';
export { raceData, classData, talentData } from './characters';
export const campaigns: Record<string, Campaign> = {
  watchtower: {
    id: 'watchtower',
    version: 1,
    title: 'Väktarnas arv',
    subtitle: 'Prolog & Kapitel I',
    description:
      'Ett övergivet vakttorn. En bruten försegling. Och något som aldrig borde ha väckts.',
    start: 'roadIntro',
    scenes: watchtowerScenes,
    storyXp,
  },
  // A second, playable entry point reuses the same narrative world; not a pretend full new campaign.
  skogsby: {
    id: 'skogsby',
    version: 1,
    title: 'Skogsbys hemligheter',
    subtitle: 'Fristående kapitel',
    description:
      'Börja i Skogsby. Vinn Miras, Runas och Edrics förtroende och undersök den försvunna lasten.',
    start: 'skogsbyReturn',
    scenes: watchtowerScenes,
    storyXp,
  },
};
export function getCampaign(id: string): Campaign {
  const campaign = campaigns[id];
  if (!campaign) throw new Error('Okänd kampanj.');
  return campaign;
}
