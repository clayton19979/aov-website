export const DRAFT_STORAGE_KEY = 'aov-fuel-calculator:draft';

const DRAFT_VERSION = 1;
const FORM_STATE_KEYS = [
  'nodes',
  'stabilityHours',
  'reserveHours',
  'deliveryDelayHours',
  'availableFuel',
  'tripCapacity',
  'tripTurnaroundHours',
  'haulerCount',
];

function hasStorageMethod(storage, methodName) {
  return storage !== null
    && typeof storage === 'object'
    && typeof storage[methodName] === 'function';
}

export function normalizeFormState(formState = {}) {
  return FORM_STATE_KEYS.reduce((normalized, key) => ({
    ...normalized,
    [key]: typeof formState[key] === 'string' ? formState[key] : '',
  }), {});
}

export function hasPopulatedFormState(formState) {
  return Object.values(normalizeFormState(formState)).some((value) => value.trim() !== '');
}

export function loadDraft(storage) {
  if (!hasStorageMethod(storage, 'getItem')) {
    return null;
  }

  let rawDraft;
  try {
    rawDraft = storage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }

  if (typeof rawDraft !== 'string' || rawDraft.trim() === '') {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(rawDraft);
    if (parsedDraft?.version !== DRAFT_VERSION || typeof parsedDraft.formState !== 'object') {
      return null;
    }

    const normalizedFormState = normalizeFormState(parsedDraft.formState);
    return hasPopulatedFormState(normalizedFormState) ? normalizedFormState : null;
  } catch {
    return null;
  }
}

export function clearDraft(storage) {
  if (!hasStorageMethod(storage, 'removeItem')) {
    return false;
  }

  try {
    storage.removeItem(DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveDraft(storage, formState) {
  if (!hasStorageMethod(storage, 'setItem')) {
    return false;
  }

  const normalizedFormState = normalizeFormState(formState);
  if (!hasPopulatedFormState(normalizedFormState)) {
    clearDraft(storage);
    return false;
  }

  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      version: DRAFT_VERSION,
      formState: normalizedFormState,
    }));
    return true;
  } catch {
    return false;
  }
}
