import test from 'node:test';
import assert from 'node:assert/strict';

import { planFuel } from './calc-core.js';
import {
  buildDispatchTextReport,
  buildNodeTableTsv,
  buildTripManifestTsv,
} from './report-export.js';

test('buildDispatchTextReport includes schedule risk and manifest sections', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, 210, 12, 0, 90, 2, 1);

  const report = buildDispatchTextReport(plan);

  assert.match(report, /Delivery timing: 0h/);
  assert.match(report, /Trip count: 3/);
  assert.match(report, /Dispatch order:/);
  assert.match(report, /Trip manifests:/);
  assert.match(report, /Trip 1 \| depart \+0h/);
});

test('buildNodeTableTsv exports dispatch rows with scheduled timing columns', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, 210, 12, 0, 90, 2, 1);

  const lines = buildNodeTableTsv(plan).split('\n');

  assert.equal(
    lines[0],
    'Node\tStatus\tPriority\tDelayHours\tStabilityHours\tReserveHours\tCurrentFuel\tMaxFuel\tBurnPerHour\tRuntimeNowHours\tRuntimeAtArrivalHours\tBaseOutageHours\tLastDropOffsetHours\tScheduledOutageHours\tFuelToStability\tStabilityGap\tFuelToReserve\tCapacityGap\tAllocatedFuel\tAllocatedForStability\tAllocatedForReserve\tReserveGap\tProjectedHoursAfterDispatch\tRunsDryBeforeArrival\tScheduledRunsDryBeforeArrival\tUsesTripCadence',
  );
  assert.match(lines[1], /^North Gate\tcritical\t0\t0\t12\t24\t90\t400\t10\t9\t9\t0\t4\t0\t30\t0\t150\t0\t150\t30\t120\t40\t20\tfalse\tfalse\ttrue$/);
  assert.match(lines[2], /^South Relay\twarning\t0\t0\t12\t24\t60\t240\t5\t12\t12\t0\t2\t0\t0\t0\t60\t0\t60\t0\t60\t10\t22\tfalse\tfalse\ttrue$/);
});

test('buildTripManifestTsv exports one row per stop', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, 210, 12, 0, 90, 2, 1);

  const lines = buildTripManifestTsv(plan).split('\n');

  assert.equal(
    lines[0],
    'TripNumber\tDepartureOffsetHours\tStopNumber\tNode\tStatus\tFuel\tForStability\tForReserve\tArrivalOffsetHours\tFuelBeforeArrival\tFuelAfterDelivery\tProjectedHoursAfterDelivery\tRemainingStabilityGap\tRemainingReserveGap\tOutageHoursBeforeArrival\tRunsDryBeforeArrival',
  );
  assert.match(lines[1], /^1\t0\t1\tNorth Gate\tcritical\t90\t30\t60\t0\t90\t180\t18\t0\t60\t0\tfalse$/);
  assert.match(lines[4], /^3\t4\t1\tNorth Gate\tcritical\t30\t0\t30\t4\t170\t200\t20\t0\t40\t0\tfalse$/);
});
