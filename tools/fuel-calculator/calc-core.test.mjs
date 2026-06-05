import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_RESERVE_HOURS, formatHours, parseNodeRows, planFuel } from './calc-core.js';

test('parseNodeRows converts CSV rows into normalized node records', () => {
  const rows = parseNodeRows([
    'North Gate,120,400,10',
    'South Relay,60,240,5',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ]);
});

test('parseNodeRows rejects malformed input', () => {
  assert.throws(
    () => parseNodeRows('Bad Row,12,40'),
    /must include name,currentFuel,maxFuel,burnPerHour/,
  );
});

test('planFuel computes reserve, refill, and alert status', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 160, maxFuel: 240, burnRatePerHour: 5 },
    { name: 'Idle Node', currentFuel: 50, maxFuel: 100, burnRatePerHour: 0 },
  ], 24);

  assert.equal(plan.reserveHours, 24);
  assert.equal(plan.counts.critical, 1);
  assert.equal(plan.counts.warning, 0);
  assert.equal(plan.counts.stable, 2);
  assert.equal(plan.totals.fuelToReserve, 150);
  assert.equal(plan.totals.fuelToFull, 440);
  assert.deepEqual(
    plan.perNode.map((node) => ({
      name: node.name,
      fuelToReserve: node.fuelToReserve,
      status: node.status,
    })),
    [
      { name: 'North Gate', fuelToReserve: 150, status: 'critical' },
      { name: 'South Relay', fuelToReserve: 0, status: 'stable' },
      { name: 'Idle Node', fuelToReserve: 0, status: 'stable' },
    ],
  );
});

test('planFuel falls back to the default reserve window', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10 },
  ]);

  assert.equal(plan.reserveHours, DEFAULT_RESERVE_HOURS);
});

test('formatHours renders human-readable durations', () => {
  assert.equal(formatHours(8.4), '8.4h');
  assert.equal(formatHours(48), '2d');
  assert.equal(formatHours(Infinity), 'Unlimited');
});
