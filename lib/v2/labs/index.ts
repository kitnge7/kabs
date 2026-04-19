import { walletDrainLab } from "./wallet-drain";
import { dataExfilLab } from "./data-exfil";
import { privilegeEscLab } from "./privilege-esc";
import type { V2Lab } from "../types";

export const V2_LABS: V2Lab[] = [walletDrainLab, dataExfilLab, privilegeEscLab];

export function getV2LabById(id: string): V2Lab | undefined {
  return V2_LABS.find((l) => l.id === id);
}
