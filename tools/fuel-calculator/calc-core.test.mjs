import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CRITICAL_STABILITY_HOURS,
  DEFAULT_DELIVERY_DELAY_HOURS,
  DEFAULT_RESERVE_HOURS,
  formatHours,
  parseNodeRows,
  planFuel,
} from './calc-core.js';

function pickDispatchFields(plan) {
  return plan.dispatch.order.map((node) => ({
    name: node.name,
    status: node.status,
    hoursRemaining: node.hoursRemaining,
    hoursAtArrival: node.hoursAtArrival,
    projectedHoursAfterDispatch: node.projectedHoursAfterDispatch,
    fuelToStability: node.fuelToStability,
    fuelToReserve: node.fuelToReserve,
    fuelToDeliver: node.fuelToDeliver,
    allocatedFuel: node.allocatedFuel,
    allocatedForStability: node.allocatedForStability,
    allocatedForReserve: node.allocatedForReserve,
    projectedStabilityShortfall: node.projectedStabilityShortfall,
    projectedShortfall: node.projectedShortfall,
    stabilityCapacityLimited: node.stabilityCapacityLimited,
    capacityLimited: node.capacityLimited,
    runsDryBeforeArrival: node.runsDryBeforeArrival,
    remainingStabilityGap: node.remainingStabilityGap,
    remainingSupplyGap: node.remainingSupplyGap,
    remainingReserveGap: node.remainingReserveGap,
    canReachStability: node.canReachStability,
    canReachReserve: node.canReachReserve,
  }));
}

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

test('parseNodeRows maps aliased headers in any order and ignores extra columns', () => {
  const rows = parseNodeRows([
    'system,max fuel,node,burn rate,notes,current fuel',
    'ignored,400,North Gate,10,critical lane,120',
    'ignored,240,South Relay,5,quiet,60',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ]);
});

test('parseNodeRows accepts quoted CSV fields and formatted numeric values', () => {
  const rows = parseNodeRows([
    'name,currentFuel,maxFuel,burnPerHour',
    '"North, Gate","1,200","2,400",12.5',
    'South Relay,600,1_200,5',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North, Gate', currentFuel: 1200, maxFuel: 2400, burnRatePerHour: 12.5 },
    { name: 'South Relay', currentFuel: 600, maxFuel: 1200, burnRatePerHour: 5 },
  ]);
});

test('parseNodeRows treats unmatched first-row labels as invalid data rather than a header', () => {
  assert.throws(
    () => parseNodeRows([
      'label,currentFuel,maxFuel,burnPerHour',
      'North Gate,120,400,10',
    ].join('\n')),
    /Row 1 has an invalid current fuel value/,
  );
});

test('parseNodeRows rejects unmatched quotes', () => {
  assert.throws(
    () => parseNodeRows('"North Gate,120,400,10'),
    /Input contains an unmatched quote/,
  );
});

test('parseNodeRows rejects malformed input', () => {
  assert.throws(
    () => parseNodeRows('Bad Row,12,40'),
    /must include name,currentFuel,maxFuel,burnPerHour/,
  );
});

test('parseNodeRows rejects duplicate node names', () => {
  assert.throws(
    () => parseNodeRows([
      'name,currentFuel,maxFuel,burnPerHour',
      'North Gate,120,400,10',
      'North Gate,80,400,10',
    ].join('\n')),
    /Row 3 duplicates node "North Gate" from row 2/,
  );
});

test('parseNodeRows rejects duplicate node names regardless of case', () => {
  assert.throws(
    () => parseNodeRows([
      'North Gate,120,400,10',
      'north gate,80,400,10',
    ].join('\n')),
    /Row 2 duplicates node "north gate" from row 1/,
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
  assert.equal(plan.deliveryDelayHours, DEFAULT_DELIVERY_DELAY_HOURS);
  assert.equal(plan.counts.critical, 1);
  assert.equal(plan.counts.warning, 0);
  assert.equal(plan.counts.stable, 2);
  assert.equal(plan.counts.arrivalRisk, 0);
  assert.equal(plan.counts.capacityLimited, 0);
  assert.equal(plan.totals.fuelConsumedBeforeArrival, 0);
  assert.equal(plan.totals.fuelAtArrival, 300);
  assert.equal(plan.totals.fuelToStability, 30);
  assert.equal(plan.totals.fuelToReserve, 150);
  assert.equal(plan.totals.fuelToDeliver, 150);
  assert.equal(plan.totals.fuelToFull, 440);
  assert.equal(plan.dispatch.allocatedForStability, 30);
  assert.equal(plan.dispatch.uncoveredStability, 0);
  assert.deepEqual(
    plan.perNode.map((node) => ({
      name: node.name,
      fuelAtArrival: node.fuelAtArrival,
      fuelToStability: node.fuelToStability,
      fuelToReserve: node.fuelToReserve,
      status: node.status,
    })),
    [
      { name: 'North Gate', fuelAtArrival: 90, fuelToStability: 30, fuelToReserve: 150, status: 'critical' },
      { name: 'South Relay', fuelAtArrival: 160, fuelToStability: 0, fuelToReserve: 0, status: 'stable' },
      { name: 'Idle Node', fuelAtArrival: 50, fuelToStability: 0, fuelToReserve: 0, status: 'stable' },
    ],
  );
});

test('planFuel accepts a custom stability floor', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 70, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 70, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, Infinity, 8);

  assert.equal(plan.stabilityHours, 8);
  assert.equal(plan.counts.critical, 1);
  assert.equal(plan.counts.warning, 1);
  assert.equal(plan.totals.fuelToStability, 10);
  assert.equal(plan.dispatch.allocatedForStability, 10);
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      status: node.status,
      fuelToStability: node.fuelToStability,
      projectedHoursAfterDispatch: node.projectedHoursAfterDispatch,
    })),
    [
      { name: 'North Gate', status: 'critical', fuelToStability: 10, projectedHoursAfterDispatch: 24 },
      { name: 'South Relay', status: 'warning', fuelToStability: 0, projectedHoursAfterDispatch: 24 },
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
  assert.deepEqual(pickDispatchFields(plan), [
    {
      name: 'North Gate',
      status: 'critical',
      hoursRemaining: 4,
      hoursAtArrival: 4,
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
      runsDryBeforeArrival: false,
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
      hoursAtArrival: 6,
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
      runsDryBeforeArrival: false,
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
      hoursAtArrival: 16,
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
      runsDryBeforeArrival: false,
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
  assert.deepEqual(pickDispatchFields(plan), [
    {
      name: 'North Gate',
      status: 'critical',
      hoursRemaining: 9,
      hoursAtArrival: 9,
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
      runsDryBeforeArrival: false,
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
      hoursAtArrival: 12,
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
      runsDryBeforeArrival: false,
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
      hoursAtArrival: 13.8,
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
      runsDryBeforeArrival: false,
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
  assert.deepEqual(pickDispatchFields(plan), [
    {
      name: 'Forward Tower',
      status: 'critical',
      hoursRemaining: 1,
      hoursAtArrival: 1,
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
      runsDryBeforeArrival: false,
      remainingStabilityGap: 20,
      remainingSupplyGap: 0,
      remainingReserveGap: 140,
      canReachStability: false,
      canReachReserve: false,
    },
  ]);
});

test('planFuel accounts for delivery delay before calculating reserve needs', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 100, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, 200, 12, 3);

  assert.equal(plan.deliveryDelayHours, 3);
  assert.equal(plan.totals.fuelConsumedBeforeArrival, 45);
  assert.equal(plan.totals.fuelAtArrival, 175);
  assert.equal(plan.counts.critical, 1);
  assert.equal(plan.counts.warning, 1);
  assert.equal(plan.counts.arrivalRisk, 0);
  assert.equal(plan.totals.fuelToStability, 30);
  assert.equal(plan.totals.fuelToReserve, 185);
  assert.deepEqual(
    plan.perNode.map((node) => ({
      name: node.name,
      hoursRemaining: node.hoursRemaining,
      hoursAtArrival: node.hoursAtArrival,
      fuelAtArrival: node.fuelAtArrival,
      fuelToReserve: node.fuelToReserve,
      status: node.status,
    })),
    [
      { name: 'North Gate', hoursRemaining: 12, hoursAtArrival: 9, fuelAtArrival: 90, fuelToReserve: 150, status: 'critical' },
      { name: 'South Relay', hoursRemaining: 20, hoursAtArrival: 17, fuelAtArrival: 85, fuelToReserve: 35, status: 'warning' },
    ],
  );
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      hoursAtArrival: node.hoursAtArrival,
      projectedHoursAfterDispatch: node.projectedHoursAfterDispatch,
      allocatedFuel: node.allocatedFuel,
    })),
    [
      { name: 'North Gate', hoursAtArrival: 9, projectedHoursAfterDispatch: 27, allocatedFuel: 150 },
      { name: 'South Relay', hoursAtArrival: 17, projectedHoursAfterDispatch: 27, allocatedFuel: 35 },
    ],
  );
});

test('planFuel flags nodes that run dry before arrival', () => {
  const plan = planFuel([
    { name: 'Forward Tower', currentFuel: 10, maxFuel: 120, burnRatePerHour: 5 },
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10 },
  ], 24, 150, 12, 3);

  assert.equal(plan.counts.arrivalRisk, 1);
  assert.equal(plan.dispatch.uncoveredStability, 0);
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      runsDryBeforeArrival: node.runsDryBeforeArrival,
      hoursRemaining: node.hoursRemaining,
      hoursAtArrival: node.hoursAtArrival,
      fuelConsumedBeforeArrival: node.fuelConsumedBeforeArrival,
      fuelToStability: node.fuelToStability,
      allocatedFuel: node.allocatedFuel,
      projectedHoursAfterDispatch: node.projectedHoursAfterDispatch,
    })),
    [
      {
        name: 'Forward Tower',
        runsDryBeforeArrival: true,
        hoursRemaining: 2,
        hoursAtArrival: 0,
        fuelConsumedBeforeArrival: 10,
        fuelToStability: 60,
        allocatedFuel: 120,
        projectedHoursAfterDispatch: 27,
      },
      {
        name: 'North Gate',
        runsDryBeforeArrival: false,
        hoursRemaining: 12,
        hoursAtArrival: 9,
        fuelConsumedBeforeArrival: 30,
        fuelToStability: 30,
        allocatedFuel: 30,
        projectedHoursAfterDispatch: 15,
      },
    ],
  );
});

test('planFuel falls back to the default reserve window and zero delivery delay', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10 },
  ]);

  assert.equal(plan.reserveHours, DEFAULT_RESERVE_HOURS);
  assert.equal(plan.deliveryDelayHours, DEFAULT_DELIVERY_DELAY_HOURS);
});

test('formatHours renders human-readable durations', () => {
  assert.equal(formatHours(8.4), '8.4h');
  assert.equal(formatHours(48), '2d');
  assert.equal(formatHours(Infinity), 'Unlimited');
});