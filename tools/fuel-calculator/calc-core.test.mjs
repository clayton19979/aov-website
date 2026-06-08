import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CRITICAL_STABILITY_HOURS,
  DEFAULT_DELIVERY_DELAY_HOURS,
  DEFAULT_HAULER_COUNT,
  DEFAULT_RESERVE_HOURS,
  DEFAULT_TRIP_TURNAROUND_HOURS,
  formatHours,
  parseHourValue,
  parseNodeRows,
  parseQuantityValue,
  planFuel,
} from './calc-core.js';

function pickTripFields(plan) {
  return plan.dispatch.trips.map((trip) => ({
    tripNumber: trip.tripNumber,
    capacity: trip.capacity,
    fuel: trip.fuel,
    remainingCapacity: trip.remainingCapacity,
    departureOffsetHours: trip.departureOffsetHours,
    stops: trip.stops.map((stop) => ({
      name: stop.name,
      status: stop.status,
      fuel: stop.fuel,
      forStability: stop.forStability,
      forReserve: stop.forReserve,
      arrivalOffsetHours: stop.arrivalOffsetHours,
      fuelBeforeArrival: stop.fuelBeforeArrival,
      fuelAfterDelivery: stop.fuelAfterDelivery,
      projectedHoursAfterDelivery: stop.projectedHoursAfterDelivery,
      remainingStabilityGap: stop.remainingStabilityGap,
      remainingReserveGap: stop.remainingReserveGap,
      runsDryBeforeArrival: stop.runsDryBeforeArrival,
    })),
  }));
}

function pickDispatchFields(plan) {
  return plan.dispatch.order.map((node) => ({
    name: node.name,
    status: node.status,
    deliveryDelayHours: node.deliveryDelayHours,
    usesCustomDeliveryDelay: node.usesCustomDeliveryDelay,
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

test('parseQuantityValue accepts shorthand suffixes for fuel-scale inputs', () => {
  assert.equal(parseQuantityValue('220k'), 220000);
  assert.equal(parseQuantityValue('1.5m'), 1500000);
  assert.equal(parseQuantityValue('2B'), 2000000000);
  assert.equal(parseQuantityValue('bad data'), null);
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

test('parseNodeRows accepts optional delivery-delay columns in headers and trailing positional fields', () => {
  const rows = parseNodeRows([
    'node,current fuel,max fuel,burn rate,travel hours',
    'North Gate,120,400,10,2.5',
    'South Relay,60,240,5,',
    'Refinery Spine,110,500,8,4',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10, deliveryDelayHours: 2.5 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
    { name: 'Refinery Spine', currentFuel: 110, maxFuel: 500, burnRatePerHour: 8, deliveryDelayHours: 4 },
  ]);

  assert.deepEqual(
    parseNodeRows('Forward Tower,90,300,6,1.5'),
    [{ name: 'Forward Tower', currentFuel: 90, maxFuel: 300, burnRatePerHour: 6, deliveryDelayHours: 1.5 }],
  );
});


test('parseNodeRows accepts percent-based fuel snapshots from inline values and percent headers', () => {
  const rows = parseNodeRows([
    'name,current fuel,max fuel,burn rate',
    'North Gate,37.5%,400,10',
    'South Relay,25%,240,5',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 150, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ]);

  assert.deepEqual(
    parseNodeRows([
      'node,fuel percent,max fuel,burn rate',
      'Refinery Spine,22,500,8',
    ].join('\n')),
    [{ name: 'Refinery Spine', currentFuel: 110, maxFuel: 500, burnRatePerHour: 8 }],
  );
});

test('parseNodeRows accepts shorthand quantities for fuel and burn values', () => {
  const rows = parseNodeRows([
    'name,currentFuel,maxFuel,burnPerHour',
    'North Gate,220k,1.5m,12.5k',
    'South Relay,600,1_200,5',
  ].join('\n'));
  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 220000, maxFuel: 1500000, burnRatePerHour: 12500 },
    { name: 'South Relay', currentFuel: 600, maxFuel: 1200, burnRatePerHour: 5 },
  ]);
});

test('parseNodeRows accepts runtime-hour snapshots when current fuel is not provided', () => {
  const rows = parseNodeRows([
    'node,hours remaining,max fuel,burn rate',
    'North Gate,15,400,10',
    'South Relay,12,240,5',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 150, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ]);
});

test('parseNodeRows rejects invalid percent and runtime-hour snapshots', () => {
  assert.throws(
    () => parseNodeRows('North Gate,120%,400,10'),
    /Row 1 has an invalid current fuel percent/,
  );

  assert.throws(
    () => parseNodeRows([
      'node,fuel percent,max fuel,burn rate',
      'North Gate,140,400,10',
    ].join('\n')),
    /Row 2 has an invalid current fuel percent/,
  );

  assert.throws(
    () => parseNodeRows([
      'node,hours remaining,max fuel,burn rate',
      'Idle Node,4,100,0',
    ].join('\n')),
    /Row 2 runtime-hours input requires burn-per-hour above zero/,
  );
});

test('parseNodeRows rejects invalid delivery delays', () => {
  assert.throws(
    () => parseNodeRows('Forward Tower,90,300,6,-1'),
    /Row 1 has an invalid delivery delay value/,
  );
});

test('parseNodeRows treats unmatched first-row labels as invalid data rather than a header', () => {
  assert.throws(
    () => parseNodeRows([
      'label,currentFuel,maxFuel,burnPerHour',
      'North Gate,120,400,10',
    ].join('\n')),
    /Row 1 has an invalid max fuel value/,
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
  assert.equal(plan.counts.customDeliveryDelay, 0);
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
      deliveryDelayHours: 0,
      usesCustomDeliveryDelay: false,
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
      deliveryDelayHours: 0,
      usesCustomDeliveryDelay: false,
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
      deliveryDelayHours: 0,
      usesCustomDeliveryDelay: false,
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
      deliveryDelayHours: 0,
      usesCustomDeliveryDelay: false,
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
      deliveryDelayHours: 0,
      usesCustomDeliveryDelay: false,
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
      deliveryDelayHours: 0,
      usesCustomDeliveryDelay: false,
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
      deliveryDelayHours: 0,
      usesCustomDeliveryDelay: false,
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

test('planFuel applies per-node delivery delays ahead of the global default', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10, deliveryDelayHours: 1 },
    { name: 'South Relay', currentFuel: 100, maxFuel: 240, burnRatePerHour: 5 },
    { name: 'Forward Tower', currentFuel: 45, maxFuel: 160, burnRatePerHour: 10, deliveryDelayHours: 5 },
  ], 24, 250, 12, 3);

  assert.equal(plan.counts.customDeliveryDelay, 2);
  assert.equal(plan.totals.fuelConsumedBeforeArrival, 70);
  assert.deepEqual(
    plan.perNode.map((node) => ({
      name: node.name,
      deliveryDelayHours: node.deliveryDelayHours,
      usesCustomDeliveryDelay: node.usesCustomDeliveryDelay,
      hoursAtArrival: node.hoursAtArrival,
      fuelAtArrival: node.fuelAtArrival,
      status: node.status,
    })),
    [
      {
        name: 'North Gate',
        deliveryDelayHours: 1,
        usesCustomDeliveryDelay: true,
        hoursAtArrival: 11,
        fuelAtArrival: 110,
        status: 'critical',
      },
      {
        name: 'South Relay',
        deliveryDelayHours: 3,
        usesCustomDeliveryDelay: false,
        hoursAtArrival: 17,
        fuelAtArrival: 85,
        status: 'warning',
      },
      {
        name: 'Forward Tower',
        deliveryDelayHours: 5,
        usesCustomDeliveryDelay: true,
        hoursAtArrival: 0,
        fuelAtArrival: 0,
        status: 'critical',
      },
    ],
  );
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      deliveryDelayHours: node.deliveryDelayHours,
      runsDryBeforeArrival: node.runsDryBeforeArrival,
      allocatedFuel: node.allocatedFuel,
      projectedHoursAfterDispatch: node.projectedHoursAfterDispatch,
    })),
    [
      {
        name: 'Forward Tower',
        deliveryDelayHours: 5,
        runsDryBeforeArrival: true,
        allocatedFuel: 160,
        projectedHoursAfterDispatch: 21,
      },
      {
        name: 'North Gate',
        deliveryDelayHours: 1,
        runsDryBeforeArrival: false,
        allocatedFuel: 90,
        projectedHoursAfterDispatch: 21,
      },
      {
        name: 'South Relay',
        deliveryDelayHours: 3,
        runsDryBeforeArrival: false,
        allocatedFuel: 0,
        projectedHoursAfterDispatch: 20,
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



test('planFuel builds trip manifests when trip capacity is provided', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 20, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'South Relay', currentFuel: 30, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'Refinery Spine', currentFuel: 80, maxFuel: 300, burnRatePerHour: 5 },
  ], 24, 130, 12, 0, 50);

  assert.equal(plan.dispatch.tripCapacity, 50);
  assert.equal(plan.dispatch.tripCount, 3);
  assert.deepEqual(plan.dispatch.tripTiming, {
    nodesAffected: 2,
    additionalArrivalRisk: 0,
    degradedStability: 0,
    degradedReserve: 0,
  });
  assert.deepEqual(pickTripFields(plan), [
    {
      tripNumber: 1,
      capacity: 50,
      fuel: 50,
      remainingCapacity: 0,
      departureOffsetHours: 0,
      stops: [
        {
          name: 'North Gate',
          status: 'critical',
          fuel: 40,
          forStability: 40,
          forReserve: 0,
          arrivalOffsetHours: 0,
          fuelBeforeArrival: 20,
          fuelAfterDelivery: 60,
          projectedHoursAfterDelivery: 12,
          remainingStabilityGap: 0,
          remainingReserveGap: 60,
          runsDryBeforeArrival: false,
        },
        {
          name: 'South Relay',
          status: 'critical',
          fuel: 10,
          forStability: 10,
          forReserve: 0,
          arrivalOffsetHours: 0,
          fuelBeforeArrival: 30,
          fuelAfterDelivery: 40,
          projectedHoursAfterDelivery: 8,
          remainingStabilityGap: 20,
          remainingReserveGap: 80,
          runsDryBeforeArrival: false,
        },
      ],
    },
    {
      tripNumber: 2,
      capacity: 50,
      fuel: 50,
      remainingCapacity: 0,
      departureOffsetHours: 0,
      stops: [
        {
          name: 'South Relay',
          status: 'critical',
          fuel: 20,
          forStability: 20,
          forReserve: 0,
          arrivalOffsetHours: 0,
          fuelBeforeArrival: 40,
          fuelAfterDelivery: 60,
          projectedHoursAfterDelivery: 12,
          remainingStabilityGap: 0,
          remainingReserveGap: 60,
          runsDryBeforeArrival: false,
        },
        {
          name: 'North Gate',
          status: 'critical',
          fuel: 30,
          forStability: 0,
          forReserve: 30,
          arrivalOffsetHours: 0,
          fuelBeforeArrival: 60,
          fuelAfterDelivery: 90,
          projectedHoursAfterDelivery: 18,
          remainingStabilityGap: 0,
          remainingReserveGap: 30,
          runsDryBeforeArrival: false,
        },
      ],
    },
    {
      tripNumber: 3,
      capacity: 50,
      fuel: 30,
      remainingCapacity: 20,
      departureOffsetHours: 0,
      stops: [
        {
          name: 'North Gate',
          status: 'critical',
          fuel: 30,
          forStability: 0,
          forReserve: 30,
          arrivalOffsetHours: 0,
          fuelBeforeArrival: 90,
          fuelAfterDelivery: 120,
          projectedHoursAfterDelivery: 24,
          remainingStabilityGap: 0,
          remainingReserveGap: 0,
          runsDryBeforeArrival: false,
        },
      ],
    },
  ]);
});

test('planFuel skips trip manifests when trip capacity is omitted', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
  ], 24, Infinity, 12, 0);

  assert.equal(plan.dispatch.tripCapacity, null);
  assert.equal(plan.dispatch.tripTurnaroundHours, null);
  assert.equal(plan.dispatch.haulerCount, null);
  assert.equal(plan.dispatch.tripCount, null);
  assert.equal(plan.tripTurnaroundHours, DEFAULT_TRIP_TURNAROUND_HOURS);
  assert.equal(plan.haulerCount, DEFAULT_HAULER_COUNT);
  assert.deepEqual(plan.dispatch.trips, []);
});

test('planFuel applies trip turnaround hours to later manifests and tracks degraded outcomes', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 20, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'South Relay', currentFuel: 30, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'Refinery Spine', currentFuel: 80, maxFuel: 300, burnRatePerHour: 5 },
  ], 24, 130, 12, 0, 50, 2);

  assert.equal(plan.dispatch.tripTurnaroundHours, 2);
  assert.deepEqual(plan.dispatch.tripTiming, {
    nodesAffected: 2,
    additionalArrivalRisk: 0,
    degradedStability: 1,
    degradedReserve: 2,
  });
  assert.deepEqual(pickTripFields(plan), [
    {
      tripNumber: 1,
      capacity: 50,
      fuel: 50,
      remainingCapacity: 0,
      departureOffsetHours: 0,
      stops: [
        {
          name: 'North Gate',
          status: 'critical',
          fuel: 40,
          forStability: 40,
          forReserve: 0,
          arrivalOffsetHours: 0,
          fuelBeforeArrival: 20,
          fuelAfterDelivery: 60,
          projectedHoursAfterDelivery: 12,
          remainingStabilityGap: 0,
          remainingReserveGap: 60,
          runsDryBeforeArrival: false,
        },
        {
          name: 'South Relay',
          status: 'critical',
          fuel: 10,
          forStability: 10,
          forReserve: 0,
          arrivalOffsetHours: 0,
          fuelBeforeArrival: 30,
          fuelAfterDelivery: 40,
          projectedHoursAfterDelivery: 8,
          remainingStabilityGap: 20,
          remainingReserveGap: 80,
          runsDryBeforeArrival: false,
        },
      ],
    },
    {
      tripNumber: 2,
      capacity: 50,
      fuel: 50,
      remainingCapacity: 0,
      departureOffsetHours: 2,
      stops: [
        {
          name: 'South Relay',
          status: 'critical',
          fuel: 20,
          forStability: 20,
          forReserve: 0,
          arrivalOffsetHours: 2,
          fuelBeforeArrival: 30,
          fuelAfterDelivery: 50,
          projectedHoursAfterDelivery: 10,
          remainingStabilityGap: 10,
          remainingReserveGap: 70,
          runsDryBeforeArrival: false,
        },
        {
          name: 'North Gate',
          status: 'critical',
          fuel: 30,
          forStability: 0,
          forReserve: 30,
          arrivalOffsetHours: 2,
          fuelBeforeArrival: 50,
          fuelAfterDelivery: 80,
          projectedHoursAfterDelivery: 16,
          remainingStabilityGap: 0,
          remainingReserveGap: 40,
          runsDryBeforeArrival: false,
        },
      ],
    },
    {
      tripNumber: 3,
      capacity: 50,
      fuel: 30,
      remainingCapacity: 20,
      departureOffsetHours: 4,
      stops: [
        {
          name: 'North Gate',
          status: 'critical',
          fuel: 30,
          forStability: 0,
          forReserve: 30,
          arrivalOffsetHours: 4,
          fuelBeforeArrival: 70,
          fuelAfterDelivery: 100,
          projectedHoursAfterDelivery: 20,
          remainingStabilityGap: 0,
          remainingReserveGap: 20,
          runsDryBeforeArrival: false,
        },
      ],
    },
  ]);
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      scheduledArrivalOffsetHours: node.scheduledArrivalOffsetHours,
      scheduledProjectedHoursAfterDispatch: node.scheduledProjectedHoursAfterDispatch,
      scheduledRemainingStabilityGap: node.scheduledRemainingStabilityGap,
      scheduledRemainingReserveGap: node.scheduledRemainingReserveGap,
      scheduledRunsDryBeforeArrival: node.scheduledRunsDryBeforeArrival,
      usesTripCadence: node.usesTripCadence,
    })),
    [
      {
        name: 'North Gate',
        scheduledArrivalOffsetHours: 4,
        scheduledProjectedHoursAfterDispatch: 20,
        scheduledRemainingStabilityGap: 0,
        scheduledRemainingReserveGap: 20,
        scheduledRunsDryBeforeArrival: false,
        usesTripCadence: true,
      },
      {
        name: 'South Relay',
        scheduledArrivalOffsetHours: 2,
        scheduledProjectedHoursAfterDispatch: 10,
        scheduledRemainingStabilityGap: 10,
        scheduledRemainingReserveGap: 70,
        scheduledRunsDryBeforeArrival: false,
        usesTripCadence: true,
      },
      {
        name: 'Refinery Spine',
        scheduledArrivalOffsetHours: 0,
        scheduledProjectedHoursAfterDispatch: 16,
        scheduledRemainingStabilityGap: 0,
        scheduledRemainingReserveGap: 40,
        scheduledRunsDryBeforeArrival: false,
        usesTripCadence: false,
      },
    ],
  );
});


test('planFuel schedules concurrent haulers into the same departure wave', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 20, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'South Relay', currentFuel: 30, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'Refinery Spine', currentFuel: 80, maxFuel: 300, burnRatePerHour: 5 },
  ], 24, 130, 12, 0, 50, 2, 2);

  assert.equal(plan.haulerCount, 2);
  assert.equal(plan.dispatch.haulerCount, 2);
  assert.deepEqual(plan.dispatch.tripTiming, {
    nodesAffected: 2,
    additionalArrivalRisk: 0,
    degradedStability: 0,
    degradedReserve: 1,
  });
  assert.deepEqual(
    plan.dispatch.trips.map((trip) => ({
      tripNumber: trip.tripNumber,
      departureOffsetHours: trip.departureOffsetHours,
      arrivalOffsetHours: trip.stops[0].arrivalOffsetHours,
    })),
    [
      { tripNumber: 1, departureOffsetHours: 0, arrivalOffsetHours: 0 },
      { tripNumber: 2, departureOffsetHours: 0, arrivalOffsetHours: 0 },
      { tripNumber: 3, departureOffsetHours: 2, arrivalOffsetHours: 2 },
    ],
  );
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      scheduledArrivalOffsetHours: node.scheduledArrivalOffsetHours,
      scheduledProjectedHoursAfterDispatch: node.scheduledProjectedHoursAfterDispatch,
      scheduledRemainingStabilityGap: node.scheduledRemainingStabilityGap,
      scheduledRemainingReserveGap: node.scheduledRemainingReserveGap,
      usesTripCadence: node.usesTripCadence,
    })),
    [
      {
        name: 'North Gate',
        scheduledArrivalOffsetHours: 2,
        scheduledProjectedHoursAfterDispatch: 22,
        scheduledRemainingStabilityGap: 0,
        scheduledRemainingReserveGap: 10,
        usesTripCadence: true,
      },
      {
        name: 'South Relay',
        scheduledArrivalOffsetHours: 0,
        scheduledProjectedHoursAfterDispatch: 12,
        scheduledRemainingStabilityGap: 0,
        scheduledRemainingReserveGap: 60,
        usesTripCadence: true,
      },
      {
        name: 'Refinery Spine',
        scheduledArrivalOffsetHours: 0,
        scheduledProjectedHoursAfterDispatch: 16,
        scheduledRemainingStabilityGap: 0,
        scheduledRemainingReserveGap: 40,
        usesTripCadence: false,
      },
    ],
  );
});

test('planFuel prioritizes long-delay critical nodes when trip waves would otherwise deepen stability loss', () => {
  const plan = planFuel([
    { name: 'Node 1', currentFuel: 42, maxFuel: 144, burnRatePerHour: 6, deliveryDelayHours: 1, priority: 2 },
    { name: 'Node 2', currentFuel: 29, maxFuel: 138, burnRatePerHour: 11, deliveryDelayHours: 4, priority: 0 },
    { name: 'Node 3', currentFuel: 39, maxFuel: 163, burnRatePerHour: 8, deliveryDelayHours: 2, priority: 2 },
  ], 24, 154, 12, 0, 48, 1, 1);

  assert.deepEqual(plan.dispatch.tripTiming, {
    nodesAffected: 2,
    additionalArrivalRisk: 0,
    degradedStability: 2,
    degradedReserve: 2,
  });
  assert.deepEqual(
    plan.dispatch.trips.map((trip) => ({
      tripNumber: trip.tripNumber,
      departureOffsetHours: trip.departureOffsetHours,
      stops: trip.stops.map((stop) => ({
        name: stop.name,
        fuel: stop.fuel,
        forStability: stop.forStability,
        arrivalOffsetHours: stop.arrivalOffsetHours,
        runsDryBeforeArrival: stop.runsDryBeforeArrival,
      })),
    })),
    [
      {
        tripNumber: 1,
        departureOffsetHours: 0,
        stops: [
          {
            name: 'Node 2',
            fuel: 45,
            forStability: 45,
            arrivalOffsetHours: 4,
            runsDryBeforeArrival: true,
          },
          {
            name: 'Node 3',
            fuel: 3,
            forStability: 3,
            arrivalOffsetHours: 2,
            runsDryBeforeArrival: false,
          },
        ],
      },
      {
        tripNumber: 2,
        departureOffsetHours: 1,
        stops: [
          {
            name: 'Node 3',
            fuel: 48,
            forStability: 48,
            arrivalOffsetHours: 3,
            runsDryBeforeArrival: false,
          },
        ],
      },
      {
        tripNumber: 3,
        departureOffsetHours: 2,
        stops: [
          {
            name: 'Node 1',
            fuel: 36,
            forStability: 36,
            arrivalOffsetHours: 3,
            runsDryBeforeArrival: false,
          },
          {
            name: 'Node 3',
            fuel: 12,
            forStability: 12,
            arrivalOffsetHours: 4,
            runsDryBeforeArrival: false,
          },
        ],
      },
      {
        tripNumber: 4,
        departureOffsetHours: 3,
        stops: [
          {
            name: 'Node 3',
            fuel: 10,
            forStability: 10,
            arrivalOffsetHours: 5,
            runsDryBeforeArrival: false,
          },
        ],
      },
    ],
  );
});

test('parseNodeRows accepts optional priority columns in headers and trailing positional fields', () => {
  const rows = parseNodeRows([
    'node,current fuel,max fuel,burn rate,travel hours,rank',
    'North Gate,120,400,10,2.5,3',
    'South Relay,60,240,5,,0',
    'Refinery Spine,110,500,8,4,1.5',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10, deliveryDelayHours: 2.5, priority: 3 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5, priority: 0 },
    { name: 'Refinery Spine', currentFuel: 110, maxFuel: 500, burnRatePerHour: 8, deliveryDelayHours: 4, priority: 1.5 },
  ]);

  assert.deepEqual(
    parseNodeRows('Forward Tower,90,300,6,1.5,2'),
    [{ name: 'Forward Tower', currentFuel: 90, maxFuel: 300, burnRatePerHour: 6, deliveryDelayHours: 1.5, priority: 2 }],
  );
});

test('parseNodeRows rejects invalid priorities', () => {
  assert.throws(
    () => parseNodeRows('Forward Tower,90,300,6,1.5,-1'),
    /Row 1 has an invalid priority value/,
  );
});

test('planFuel uses per-node priority to break ties inside the same alert band', () => {
  const plan = planFuel([
    { name: 'Forward Tower', currentFuel: 30, maxFuel: 200, burnRatePerHour: 5 },
    { name: 'Command Spine', currentFuel: 50, maxFuel: 200, burnRatePerHour: 5, priority: 3 },
    { name: 'South Relay', currentFuel: 70, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, 70);

  assert.equal(plan.counts.customPriority, 1);
  assert.equal(plan.dispatch.allocatedForStability, 40);
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      priority: node.priority,
      allocatedFuel: node.allocatedFuel,
      allocatedForStability: node.allocatedForStability,
      allocatedForReserve: node.allocatedForReserve,
    })),
    [
      {
        name: 'Command Spine',
        priority: 3,
        allocatedFuel: 40,
        allocatedForStability: 10,
        allocatedForReserve: 30,
      },
      {
        name: 'Forward Tower',
        priority: 0,
        allocatedFuel: 30,
        allocatedForStability: 30,
        allocatedForReserve: 0,
      },
      {
        name: 'South Relay',
        priority: 0,
        allocatedFuel: 0,
        allocatedForStability: 0,
        allocatedForReserve: 0,
      },
    ],
  );
});

test('parseNodeRows accepts optional stability and reserve hour columns in headers and trailing positional fields', () => {
  const rows = parseNodeRows([
    'node,current fuel,max fuel,burn rate,travel hours,rank,critical floor hours,reserve window hours',
    'North Gate,120,400,10,2.5,3,12,30',
    'South Relay,60,240,5,,0,,18',
    'Refinery Spine,110,500,8,4,1.5,16,36',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10, deliveryDelayHours: 2.5, priority: 3, stabilityHours: 12, reserveHours: 30 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5, priority: 0, reserveHours: 18 },
    { name: 'Refinery Spine', currentFuel: 110, maxFuel: 500, burnRatePerHour: 8, deliveryDelayHours: 4, priority: 1.5, stabilityHours: 16, reserveHours: 36 },
  ]);

  assert.deepEqual(
    parseNodeRows('Forward Tower,90,300,6,1.5,2,10,24'),
    [{ name: 'Forward Tower', currentFuel: 90, maxFuel: 300, burnRatePerHour: 6, deliveryDelayHours: 1.5, priority: 2, stabilityHours: 10, reserveHours: 24 }],
  );
});

test('parseNodeRows rejects invalid stability and reserve overrides', () => {
  assert.throws(
    () => parseNodeRows('Forward Tower,90,300,6,1.5,2,-1,24'),
    /Row 1 has an invalid stability-hours value/,
  );

  assert.throws(
    () => parseNodeRows('Forward Tower,90,300,6,1.5,2,10,-1'),
    /Row 1 has an invalid reserve-hours value/,
  );
});

test('planFuel applies per-node stability and reserve windows ahead of global defaults', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10, stabilityHours: 8, reserveHours: 30 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5, reserveHours: 18 },
    { name: 'Refinery Spine', currentFuel: 110, maxFuel: 500, burnRatePerHour: 8, stabilityHours: 16 },
  ], 24, 240, 12, 0);

  assert.equal(plan.counts.customStabilityHours, 2);
  assert.equal(plan.counts.customReserveHours, 2);
  assert.equal(plan.totals.fuelToStability, 18);
  assert.equal(plan.totals.fuelToReserve, 322);
  assert.deepEqual(
    plan.perNode.map((node) => ({
      name: node.name,
      stabilityHours: node.stabilityHours,
      reserveHours: node.reserveHours,
      usesCustomStabilityHours: node.usesCustomStabilityHours,
      usesCustomReserveHours: node.usesCustomReserveHours,
      status: node.status,
      fuelToStability: node.fuelToStability,
      fuelToReserve: node.fuelToReserve,
    })),
    [
      {
        name: 'North Gate',
        stabilityHours: 8,
        reserveHours: 30,
        usesCustomStabilityHours: true,
        usesCustomReserveHours: true,
        status: 'warning',
        fuelToStability: 0,
        fuelToReserve: 210,
      },
      {
        name: 'South Relay',
        stabilityHours: 12,
        reserveHours: 18,
        usesCustomStabilityHours: false,
        usesCustomReserveHours: true,
        status: 'warning',
        fuelToStability: 0,
        fuelToReserve: 30,
      },
      {
        name: 'Refinery Spine',
        stabilityHours: 16,
        reserveHours: 24,
        usesCustomStabilityHours: true,
        usesCustomReserveHours: false,
        status: 'critical',
        fuelToStability: 18,
        fuelToReserve: 82,
      },
    ],
  );
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      stabilityHours: node.stabilityHours,
      reserveHours: node.reserveHours,
      allocatedFuel: node.allocatedFuel,
      remainingReserveGap: node.remainingReserveGap,
    })),
    [
      {
        name: 'Refinery Spine',
        stabilityHours: 16,
        reserveHours: 24,
        allocatedFuel: 82,
        remainingReserveGap: 0,
      },
      {
        name: 'North Gate',
        stabilityHours: 8,
        reserveHours: 30,
        allocatedFuel: 158,
        remainingReserveGap: 52,
      },
      {
        name: 'South Relay',
        stabilityHours: 12,
        reserveHours: 18,
        allocatedFuel: 0,
        remainingReserveGap: 30,
      },
    ],
  );
});


test('planFuel totals base outage hours for nodes that run dry before arrival', () => {
  const plan = planFuel([
    { name: 'Forward Tower', currentFuel: 10, maxFuel: 120, burnRatePerHour: 5 },
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10 },
  ], 24, 150, 12, 3);

  assert.equal(plan.counts.arrivalRisk, 1);
  assert.equal(plan.totals.outageHoursBeforeArrival, 1);
  assert.equal(plan.totals.scheduledOutageHours, 1);
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      outageHoursBeforeArrival: node.outageHoursBeforeArrival,
      scheduledOutageHours: node.scheduledOutageHours,
    })),
    [
      { name: 'Forward Tower', outageHoursBeforeArrival: 1, scheduledOutageHours: 1 },
      { name: 'North Gate', outageHoursBeforeArrival: 0, scheduledOutageHours: 0 },
    ],
  );
});

test('planFuel tracks convoy-added outage hours when later manifests land after burnout', () => {
  const plan = planFuel([
    { name: 'Forward Tower', currentFuel: 12, maxFuel: 200, burnRatePerHour: 2 },
  ], 24, 40, 12, 1, 20, 16, 1);

  assert.equal(plan.counts.arrivalRisk, 0);
  assert.equal(plan.totals.outageHoursBeforeArrival, 0);
  assert.equal(plan.totals.scheduledOutageHours, 1);
  assert.deepEqual(plan.dispatch.tripTiming, {
    nodesAffected: 1,
    additionalArrivalRisk: 1,
    degradedStability: 1,
    degradedReserve: 1,
  });
  assert.deepEqual(
    plan.dispatch.trips.map((trip) => ({
      tripNumber: trip.tripNumber,
      departureOffsetHours: trip.departureOffsetHours,
      stops: trip.stops.map((stop) => ({
        fuel: stop.fuel,
        arrivalOffsetHours: stop.arrivalOffsetHours,
        outageHoursBeforeArrival: stop.outageHoursBeforeArrival,
        runsDryBeforeArrival: stop.runsDryBeforeArrival,
      })),
    })),
    [
      {
        tripNumber: 1,
        departureOffsetHours: 0,
        stops: [
          {
            fuel: 20,
            arrivalOffsetHours: 1,
            outageHoursBeforeArrival: 0,
            runsDryBeforeArrival: false,
          },
        ],
      },
      {
        tripNumber: 2,
        departureOffsetHours: 16,
        stops: [
          {
            fuel: 18,
            arrivalOffsetHours: 17,
            outageHoursBeforeArrival: 1,
            runsDryBeforeArrival: true,
          },
        ],
      },
    ],
  );
  assert.deepEqual(
    plan.dispatch.order.map((node) => ({
      name: node.name,
      outageHoursBeforeArrival: node.outageHoursBeforeArrival,
      scheduledOutageHours: node.scheduledOutageHours,
      scheduledRunsDryBeforeArrival: node.scheduledRunsDryBeforeArrival,
    })),
    [
      {
        name: 'Forward Tower',
        outageHoursBeforeArrival: 0,
        scheduledOutageHours: 1,
        scheduledRunsDryBeforeArrival: true,
      },
    ],
  );
});

test('parseHourValue accepts duration strings and rejects malformed ones', () => {
  assert.equal(parseHourValue('36h'), 36);
  assert.equal(parseHourValue('1d 12h'), 36);
  assert.equal(parseHourValue('90m'), 1.5);
  assert.equal(parseHourValue('1d, 30m'), 24.5);
  assert.equal(parseHourValue('1d12h'), 36);
  assert.equal(parseHourValue('bad data'), null);
  assert.equal(parseHourValue('1w'), null);
});

test('parseNodeRows accepts duration strings for runtime and hour override columns', () => {
  const rows = parseNodeRows([
    'node,hours remaining,max fuel,burn rate,travel hours,rank,critical floor hours,reserve window hours',
    'North Gate,1d 6h,400,10,90m,2,12h,36h',
    'South Relay,90m,240,5,30m,0,6h,1d',
  ].join('\n'));

  assert.deepEqual(rows, [
    { name: 'North Gate', currentFuel: 300, maxFuel: 400, burnRatePerHour: 10, deliveryDelayHours: 1.5, priority: 2, stabilityHours: 12, reserveHours: 36 },
    { name: 'South Relay', currentFuel: 7.5, maxFuel: 240, burnRatePerHour: 5, deliveryDelayHours: 0.5, priority: 0, stabilityHours: 6, reserveHours: 24 },
  ]);
});

test('parseNodeRows rejects malformed duration strings in runtime and override columns', () => {
  assert.throws(
    () => parseNodeRows([
      'node,hours remaining,max fuel,burn rate',
      'North Gate,1w,400,10',
    ].join('\n')),
    /Row 2 has an invalid runtime-hours value/,
  );

  assert.throws(
    () => parseNodeRows('Forward Tower,90,300,6,soon'),
    /Row 1 has an invalid delivery delay value/,
  );

  assert.throws(
    () => parseNodeRows('Forward Tower,90,300,6,1h,2,overnight,24h'),
    /Row 1 has an invalid stability-hours value/,
  );

  assert.throws(
    () => parseNodeRows('Forward Tower,90,300,6,1h,2,10h,tomorrow'),
    /Row 1 has an invalid reserve-hours value/,
  );
});

test('planFuel accepts shorthand quantities for stockpile and trip capacity inputs', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, '220k', 12, 0, '90k', 2, 1);
  assert.equal(plan.availableFuel, 220000);
  assert.equal(plan.dispatch.tripCapacity, 90000);
  assert.equal(plan.dispatch.remainingFuel, 219790);
  assert.equal(plan.dispatch.tripCount, 1);
});

test('planFuel accepts duration strings for global and per-node hour inputs', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 120, maxFuel: 400, burnRatePerHour: 10, deliveryDelayHours: '90m', stabilityHours: '12h', reserveHours: '36h' },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ], '1d 12h', 260, '10h', '2h', 100, '90m', 1);

  assert.equal(plan.reserveHours, 36);
  assert.equal(plan.stabilityHours, 10);
  assert.equal(plan.deliveryDelayHours, 2);
  assert.equal(plan.dispatch.tripTurnaroundHours, 1.5);
  assert.deepEqual(
    plan.perNode.map((node) => ({
      name: node.name,
      deliveryDelayHours: node.deliveryDelayHours,
      stabilityHours: node.stabilityHours,
      reserveHours: node.reserveHours,
    })),
    [
      { name: 'North Gate', deliveryDelayHours: 1.5, stabilityHours: 12, reserveHours: 36 },
      { name: 'South Relay', deliveryDelayHours: 2, stabilityHours: 10, reserveHours: 36 },
    ],
  );
});

