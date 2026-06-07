import test from 'node:test';
import assert from 'node:assert/strict';

import { buildShareUrl, parseShareState } from './state-share.js';

test('buildShareUrl stores only populated form fields', () => {
  const url = buildShareUrl(
    {
      nodes: 'North Gate,90,400,10',
      stabilityHours: '12',
      reserveHours: '24',
      deliveryDelayHours: '3',
      availableFuel: '',
      tripCapacity: '90',
      tripTurnaroundHours: '2',
      haulerCount: '2',
    },
    'https://example.com/tools/fuel-calculator/index.html?old=1#summary',
  );

  assert.equal(
    url,
    'https://example.com/tools/fuel-calculator/index.html?nodes=North+Gate%2C90%2C400%2C10&stability=12&reserve=24&delay=3&capacity=90&turnaround=2&haulers=2#summary',
  );
});

test('parseShareState restores form values from a share link', () => {
  const state = parseShareState(
    'https://example.com/tools/fuel-calculator/index.html?nodes=North+Gate%2C90%2C400%2C10%0ASouth+Relay%2C60%2C240%2C5&stability=12&reserve=24&delay=3&fuel=220&capacity=90&turnaround=2&haulers=2',
  );

  assert.deepEqual(state, {
    nodes: 'North Gate,90,400,10\nSouth Relay,60,240,5',
    stabilityHours: '12',
    reserveHours: '24',
    deliveryDelayHours: '3',
    availableFuel: '220',
    tripCapacity: '90',
    tripTurnaroundHours: '2',
    haulerCount: '2',
  });
});
