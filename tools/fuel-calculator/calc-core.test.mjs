import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CRITICAL_STABILITY_HOURS,
  DEFAULT_RESERVE_HOURS,
  formatHours,
  parseNodeRows,
  planFuel,
} from './calc-core.js';

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

test('parseNodeRows accepts header rows, comments, and tab-separated exports', () => {
  const rows = parseNodeRows([
    'name\tcurrentFuel\tmaxFuel\tburnPerHour',
    '# pasted from sheet',
    'North Gate\t120\t400\t10',
    'South Relay\t60\t240\t5',
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

  assert.equal(plan.stabilityHours, CRITICAL_STABILITY_HOURS);
  assert.equal(plan.reserveHours, 24);
  assert.equal(plan.counts.critical, 1);
  assert.equal(plan.counts.warning, 0);
  assert.equal(plan.counts.stable, 2);
  assert.equal(plan.counts.capacityLimited, 0);
  assert.equal(plan.totals.fuelToStability, 30);
  assert.equal(plan.totals.fuelToReserve, 150);
  assert.equal(plan.totals.fuelToDeliver, 150);
  assert.equal(plan.totals.fuelToFull, 440);
  assert.equal(plan.dispatch.allocatedForStability, 30);
  assert.equal(plan.dispatch.uncoveredStability, 0);
  assert.deepEqual(
    plan.perNode.map((node) => ({
      name: node.name,
      fuelToStability: node.fuelToStability,
      fuelToReserve: node.fuelToReserve,
      status: node.status,
    })),
    [
      { name: 'North Gate', fuelToStability: 30, fuelToReserve: 150, status: 'critical' },
      { name: 'South Relay', fuelToStability: 0, fuelToReserve: 0, status: 'stable' },
      { name: 'Idle Node', fuelToStability: 0, fuelToReserve: 0, status: 'stable' },
    ],
  );
});

test('planFuel stabilizes all critical nodes before spending fuel on reserve fill', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 20, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'South Relay', currentFuel: 30, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'Refinery Spine', currentFuel: 80, maxFuel: 300, burnRatePerHour: 5 },
  ], 24, 70);

  assert.equal(plan.dispatch.allocatedFuel, 70);
  assert.equal(plan.dispatch.allocatedForStability, 70);
  assert.equal(plan.dispatch.uncoveredStability, 0);
  assert.equal(plan.dispatch.uncoveredReserve, 160);
  assert.deepEqual(plan.dispatch.order, [
    {
      name: 'North Gate',
      status: 'critical',
      hoursRemaining: 4,
      projectedHoursAfterDispatch: 12,
      fuelToStability: 40,
      fuelToReserve: 100,
      fuelToDeliver: 100,
      allocatedFuel: 40,
      allocatedForStability: 40,
      allocatedForReserve: 0,
      projectedStabilityShortfall: 0,
      projectedShortfall: 0,
      stabilityCapacityLimited: false,
      capacityLimited: false,
      remainingStabilityGap: 0,
      remainingSupplyGap: 60,
      remainingReserveGap: 60,
      canReachStability: true,
      canReachReserve: false,
    },
    {
      name: 'South Relay',
      status: 'critical',
      hoursRemaining: 6,
      projectedHoursAfterDispatch: 12,
      fuelToStability: 30,
      fuelToReserve: 90,
      fuelToDeliver: 90,
      allocatedFuel: 30,
      allocatedForStability: 30,
      allocatedForReserve: 0,
      projectedStabilityShortfall: 0,
      projectedShortfall: 0,
      stabilityCapacityLimited: false,
      capacityLimited: false,
      remainingStabilityGap: 0,
      remainingSupplyGap: 60,
      remainingReserveGap: 60,
      canReachStability: true,
      canReachReserve: false,
    },
    {
      name: 'Refinery Spine',
      status: 'warning',
      hoursRemaining: 16,
      projectedHoursAfterDispatch: 16,
      fuelToStability: 0,
      fuelToReserve: 40,
      fuelToDeliver: 40,
      allocatedFuel: 0,
      allocatedForStability: 0,
      allocatedForReserve: 0,
      projectedStabilityShortfall: 0,
      projectedShortfall: 0,
      stabilityCapacityLimited: false,
      capacityLimited: false,
      remainingStabilityGap: 0,
      remainingSupplyGap: 40,
      remainingReserveGap: 40,
      canReachStability: true,
      canReachReserve: false,
    },
  ]);
});

test('planFuel allocates limited stockpile by urgency and time remaining after stabilization', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'Refinery Spine', currentFuel: 110, maxFuel: 500, burnRatePerHour: 8 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, 220);

  assert.equal(plan.dispatch.allocatedFuel, 220);
  assert.equal(plan.dispatch.allocatedForStability, 30);
  assert.equal(plan.dispatch.uncoveredStability, 0);
  assert.equal(plan.dispatch.uncoveredReserve, 72);
  assert.equal(plan.dispatch.remainingFuel, 0);
  assert.deepEqual(plan.dispatch.order, [
    {
      name: 'North Gate',
      status: 'critical',
      hoursRemaining: 9,
      projectedHoursAfterDispatch: 24,
      fuelToStability: 30,
      fuelToReserve: 150,
      fuelToDeliver: 150,
      allocatedFuel: 150,
      allocatedForStability: 30,
      allocatedForReserve: 120,
      projectedStabilityShortfall: 0,
      projectedShortfall: 0,
      stabilityCapacityLimited: false,
      capacityLimited: false,
      remainingStabilityGap: 0,
      remainingSupplyGap: 0,
      remainingReserveGap: 0,
      canReachStability: true,
      canReachReserve: true,
    },
    {
      name: 'South Relay',
      status: 'warning',
      hoursRemaining: 12,
      projectedHoursAfterDispatch: 24,
      fuelToStability: 0,
      fuelToReserve: 60,
      fuelToDeliver: 60,
      allocatedFuel: 60,
      allocatedForStability: 0,
      allocatedForReserve: 60,
      projectedStabilityShortfall: 0,
      projectedShortfall: 0,
      stabilityCapacityLimited: false,
      capacityLimited: false,
      remainingStabilityGap: 0,
      remainingSupplyGap: 0,
      remainingReserveGap: 0,
      canReachStability: true,
      canReachReserve: true,
    },
    {
      name: 'Refinery Spine',
      status: 'warning',
      hoursRemaining: 13.8,
      projectedHoursAfterDispatch: 15,
      fuelToStability: 0,
      fuelToReserve: 82,
      fuelToDeliver: 82,
      allocatedFuel: 10,
      allocatedForStability: 0,
      allocatedForReserve: 10,
      projectedStabilityShortfall: 0,
      projectedShortfall: 0,
      stabilityCapacityLimited: false,
      capacityLimited: false,
      remainingStabilityGap: 0,
      remainingSupplyGap: 72,
      remainingReserveGap: 72,
      canReachStability: true,
      canReachReserve: false,
    },
  ]);
});

test('planFuel caps dispatch at node max capacity and tracks structural stability and reserve gaps', () => {
  const plan = planFuel([
    { name: 'Forward Tower', currentFuel: 10, maxFuel: 100, burnRatePerHour: 10 },
  ], 24, 500);

  assert.equal(plan.counts.capacityLimited, 1);
  assert.equal(plan.counts.stabilityCapacityLimited, 1);
  assert.equal(plan.totals.fuelToStability, 90);
  assert.equal(plan.totals.fuelToReserve, 230);
  assert.equal(plan.totals.fuelToDeliver, 90);
  assert.equal(plan.dispatch.allocatedForStability, 90);
  assert.equal(plan.dispatch.allocatedFuel, 90);
  assert.equal(plan.dispatch.uncoveredStability, 20);
  assert.equal(plan.dispatch.uncoveredReserve, 140);
  assert.deepEqual(plan.dispatch.order, [
    {
      name: 'Forward Tower',
      status: 'critical',
      hoursRemaining: 1,
      projectedHoursAfterDispatch: 10,
      fuelToStability: 90,
      fuelToReserve: 230,
      fuelToDeliver: 90,
      allocatedFuel: 90,
      allocatedForStability: 90,
      allocatedForReserve: 0,
      projectedStabilityShortfall: 20,
      projectedShortfall: 140,
      stabilityCapacityLimited: true,
      capacityLimited: true,
      remainingStabilityGap: 20,
      remainingSupplyGap: 0,
      remainingReserveGap: 140,
      canReachStability: false,
      canReachReserve: false,
    },
  ]);
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
