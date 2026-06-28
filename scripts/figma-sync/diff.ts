import { hashEntity } from "./hash";
import type { EntityStatus, SyncEntry, SyncState } from "./types";

export interface EntityDiff {
  key: string;
  status: EntityStatus;
  figmaHash: string;
  codeHash: string;
}

export function classifyEntity(
  key: string,
  candidate: unknown | undefined,
  codeState: unknown | undefined,
  prev: SyncEntry | undefined,
): EntityDiff {
  const figmaHash = candidate === undefined ? "" : hashEntity(candidate);
  const codeHash = codeState === undefined ? "" : hashEntity(codeState);

  let status: EntityStatus;
  if (candidate === undefined) {
    status = "removed";
  } else if (!prev) {
    status = "new";
  } else {
    const figmaChanged = figmaHash !== prev.figmaHash;
    const codeChanged = codeHash !== prev.codeHash;
    if (!figmaChanged && !codeChanged) status = "in-sync";
    else if (figmaChanged && !codeChanged) status = "figma-changed";
    else if (!figmaChanged && codeChanged) status = "code-drift";
    else status = "conflict";
  }
  return { key, status, figmaHash, codeHash };
}

export function classifyAll(
  candidates: Record<string, unknown>,
  codeStates: Record<string, unknown>,
  prev: SyncState,
): EntityDiff[] {
  const keys = new Set([...Object.keys(candidates), ...Object.keys(prev)]);
  return [...keys]
    .sort()
    .map((key) => classifyEntity(key, candidates[key], codeStates[key], prev[key]));
}
