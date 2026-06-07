import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DRAFT_STORAGE_KEY,
  clearDraft,
  hasPopulatedFormState,
  loadDraft,
  normalizeFormState,
  saveDraft,
} from './local-draft.js';

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test('normalizeFormState keeps only supported string fields', () => {
  assert.deepEqual(
    normalizeFormState({
      nodes: 'North Gate,90,400,10',
      availableFuel: 220,
      tripCapacity: '90',
      extra: 'ignored',
    }),
    {
      nodes: 'North Gate,90,400,10',
      stabilityHours: '',
      reserveHours: '',
      deliveryDelayHours: '',
      availableFuel: '',
      tripCapacity: '90',
      tripTurnaroundHours: '',
      haulerCount: '',
    },
  );
});

test('hasPopulatedFormState detects whether any field is filled', () => {
  assert.equal(hasPopulatedFormState({ nodes: '', reserveHours: '   ' }), false);
  assert.equal(hasPopulatedFormState({ nodes: 'North Gate,90,400,10' }), true);
});

test('saveDraft stores a versioned normalized draft and loadDraft restores it', () => {
  const storage = createStorage();
  const saved = saveDraft(storage, {
    nodes: 'North Gate,90,400,10',
    reserveHours: '24',
    tripCapacity: '90',
  });

  assert.equal(saved, true);
  assert.deepEqual(loadDraft(storage), {
    nodes: 'North Gate,90,400,10',
    stabilityHours: '',
    reserveHours: '24',
    deliveryDelayHours: '',
    availableFuel: '',
    tripCapacity: '90',
    tripTurnaroundHours: '',
    haulerCount: '',
  });
});

test('saveDraft clears storage instead of writing an empty draft', () => {
  const storage = createStorage({
    [DRAFT_STORAGE_KEY]: '{"version":1,"formState":{"nodes":"North Gate,90,400,10"}}',
  });

  const saved = saveDraft(storage, {
    nodes: '',
    reserveHours: ' ',
  });

  assert.equal(saved, false);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null);
});

test('loadDraft ignores malformed or stale draft payloads', () => {
  assert.equal(
    loadDraft(createStorage({
      [DRAFT_STORAGE_KEY]: 'not json',
    })),
    null,
  );
  assert.equal(
    loadDraft(createStorage({
      [DRAFT_STORAGE_KEY]: '{"version":99,"formState":{"nodes":"North Gate,90,400,10"}}',
    })),
    null,
  );
});

test('persistence helpers fail closed when storage access throws', () => {
  const errorStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };

  assert.equal(loadDraft(errorStorage), null);
  assert.equal(saveDraft(errorStorage, { nodes: 'North Gate,90,400,10' }), false);
  assert.equal(clearDraft(errorStorage), false);
});

test('clearDraft removes the saved draft when storage is available', () => {
  const storage = createStorage({
    [DRAFT_STORAGE_KEY]: '{"version":1,"formState":{"nodes":"North Gate,90,400,10"}}',
  });

  assert.equal(clearDraft(storage), true);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null);
});
