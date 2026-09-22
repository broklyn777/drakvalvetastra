import type { GameState } from '../../engine/src/types';
import { getCampaign } from '../../content/src';
import { saveSchema, makeSave, type SaveFile } from '../../protocol/src/schema';
export interface SaveRepository {
  list(): SaveFile[];
  write(slot: string, state: GameState, label: string): void;
  read(slot: string): SaveFile | null;
  remove(slot: string): void;
}
export function parseSave(raw: unknown): SaveFile {
  const save = saveSchema.parse(raw);
  const campaign = getCampaign(save.state.campaignId);
  if (campaign.version !== save.state.campaignVersion)
    throw new Error('Sparningen kräver en annan kampanjversion.');
  const scenes = campaign.scenes(save.state, save.state.players[0].id);
  if (!scenes[save.state.scene] || (save.state.combat && !scenes[save.state.combat.onWin]))
    throw new Error('Sparningen innehåller en okänd scen.');
  return save;
}
export class BrowserSaveRepository implements SaveRepository {
  constructor(private storage: Storage) {}
  list() {
    return ['auto', '1', '2', '3'].flatMap((slot) => {
      const save = this.read(slot);
      return save ? [save] : [];
    });
  }
  read(slot: string) {
    const raw = this.storage.getItem(`drakvalvet:save:${slot}`);
    return raw ? parseSave(JSON.parse(raw)) : null;
  }
  write(slot: string, state: GameState, label: string) {
    this.storage.setItem(`drakvalvet:save:${slot}`, JSON.stringify(makeSave(state, label)));
  }
  remove(slot: string) {
    this.storage.removeItem(`drakvalvet:save:${slot}`);
  }
}
