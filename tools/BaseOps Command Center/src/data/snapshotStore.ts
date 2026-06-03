import { BaseSnapshot } from "./baseOps";

const LEGACY_SNAPSHOT_CACHE_KEY = "baseops-command-center:last-snapshot";
const SNAPSHOT_CACHE_PREFIX = "baseops-command-center:last-snapshot:";

export function normalizeOwnerAddress(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  return /^0x[a-f0-9]{1,64}$/.test(trimmed) ? trimmed : null;
}

export function snapshotCacheKey(ownerAddress: string): string {
  return `${SNAPSHOT_CACHE_PREFIX}${ownerAddress}`;
}

export function loadStoredSnapshot(
  readSnapshot: (key: string) => BaseSnapshot | null,
  ownerAddress: string,
): BaseSnapshot | null {
  const normalizedOwner = normalizeOwnerAddress(ownerAddress);
  if (!normalizedOwner) return null;

  const ownerSnapshot = readSnapshot(snapshotCacheKey(normalizedOwner));
  if (ownerSnapshot) return ownerSnapshot;

  const legacySnapshot = readSnapshot(LEGACY_SNAPSHOT_CACHE_KEY);
  if (legacySnapshot && normalizeOwnerAddress(legacySnapshot.ownerAddress) === normalizedOwner) {
    return legacySnapshot;
  }

  return null;
}

export function storeSnapshot(
  writeSnapshot: (key: string, snapshot: BaseSnapshot) => void,
  snapshot: BaseSnapshot,
) {
  const normalizedOwner = normalizeOwnerAddress(snapshot.ownerAddress);
  if (!normalizedOwner) return;

  writeSnapshot(snapshotCacheKey(normalizedOwner), snapshot);
}
