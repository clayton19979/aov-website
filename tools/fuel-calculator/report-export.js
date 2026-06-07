function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function formatHourLabel(value) {
  return `${formatNumber(value)}h`;
}

function formatOutageHours(value) {
  return value > 0 ? formatHourLabel(value) : '0h';
}

function formatOutageSummary(count, hours) {
  return count === 0 ? 'Clear' : `${count} node${count === 1 ? '' : 's'} / ${formatOutageHours(hours)}`;
}

function formatPriority(value) {
  return value > 0 ? `P${formatNumber(value)}` : 'Base';
}

function formatTripCapacity(value) {
  return value === null ? 'Direct dispatch' : `${formatNumber(value)} / trip`;
}

function formatFuelBudget(value) {
  return value === null ? 'Open' : formatNumber(value);
}

function formatOffsetLabel(value) {
  return `+${formatHourLabel(value)}`;
}

function getDelayCoverageLabel(plan) {
  if (plan.counts.customDeliveryDelay === 0) {
    return formatHourLabel(plan.deliveryDelayHours);
  }
  return `${formatHourLabel(plan.deliveryDelayHours)} default + ${plan.counts.customDeliveryDelay} override${plan.counts.customDeliveryDelay === 1 ? '' : 's'}`;
}

function getPriorityCoverageLabel(plan) {
  if (plan.counts.customPriority === 0) {
    return 'Base queue';
  }
  return `${plan.counts.customPriority} override${plan.counts.customPriority === 1 ? '' : 's'}`;
}

function getStabilityCoverageLabel(plan) {
  if (plan.counts.customStabilityHours === 0) {
    return formatHourLabel(plan.stabilityHours);
  }
  return `${formatHourLabel(plan.stabilityHours)} default + ${plan.counts.customStabilityHours} override${plan.counts.customStabilityHours === 1 ? '' : 's'}`;
}

function getReserveCoverageLabel(plan) {
  if (plan.counts.customReserveHours === 0) {
    return formatHourLabel(plan.reserveHours);
  }
  return `${formatHourLabel(plan.reserveHours)} default + ${plan.counts.customReserveHours} override${plan.counts.customReserveHours === 1 ? '' : 's'}`;
}

function getTripRiskLabel(plan) {
  if (plan.dispatch.tripCapacity === null) {
    return 'No batching';
  }

  const tripTiming = plan.dispatch.tripTiming;
  const issues = tripTiming.additionalArrivalRisk + tripTiming.degradedStability + tripTiming.degradedReserve;
  if (issues === 0) {
    return 'No extra batching risk';
  }

  return `${issues} timing impact${issues === 1 ? '' : 's'}`;
}

function getScheduledOutageNodeCount(plan) {
  return plan.dispatch.order.filter((node) => (node.scheduledOutageHours ?? node.outageHoursBeforeArrival) > 0).length;
}

function getDisplayStabilityGap(plan, node) {
  return plan.dispatch.tripCapacity === null
    ? node.remainingStabilityGap
    : node.scheduledRemainingStabilityGap;
}

function getDisplayReserveGap(plan, node) {
  return plan.dispatch.tripCapacity === null
    ? node.remainingReserveGap
    : node.scheduledRemainingReserveGap;
}

function getDisplayProjectedHours(plan, node) {
  return plan.dispatch.tripCapacity === null
    ? node.projectedHoursAfterDispatch
    : node.scheduledProjectedHoursAfterDispatch;
}

function getDisplayRunsDry(plan, node) {
  return plan.dispatch.tripCapacity === null
    ? node.runsDryBeforeArrival
    : node.scheduledRunsDryBeforeArrival;
}

function getDisplayOutageHours(plan, node) {
  return plan.dispatch.tripCapacity === null
    ? node.outageHoursBeforeArrival
    : node.scheduledOutageHours;
}

export function buildDispatchTextReport(plan) {
  const header = [
    `Delivery timing: ${getDelayCoverageLabel(plan)}`,
    `Priority overrides: ${getPriorityCoverageLabel(plan)}`,
    `Critical floors: ${getStabilityCoverageLabel(plan)}`,
    `Reserve windows: ${getReserveCoverageLabel(plan)}`,
    `Fuel on hand: ${formatFuelBudget(plan.availableFuel)}`,
    `Trip capacity: ${formatTripCapacity(plan.dispatch.tripCapacity)}`,
    `Trip turnaround: ${plan.dispatch.tripTurnaroundHours === null ? 'Not batched' : formatHourLabel(plan.dispatch.tripTurnaroundHours)}`,
    `Haulers: ${plan.dispatch.haulerCount === null ? 'Not batched' : formatNumber(plan.dispatch.haulerCount)}`,
    `Trip count: ${plan.dispatch.tripCount === null ? 'Not batched' : plan.dispatch.tripCount}`,
    `Trip timing risk: ${getTripRiskLabel(plan)}`,
    `Fuel burned before arrival: ${formatNumber(plan.totals.fuelConsumedBeforeArrival)}`,
    `Base outage: ${formatOutageSummary(plan.counts.arrivalRisk, plan.totals.outageHoursBeforeArrival)}`,
    `Scheduled outage: ${formatOutageSummary(getScheduledOutageNodeCount(plan), plan.totals.scheduledOutageHours)}`,
    `Fuel needed to stabilize: ${formatNumber(plan.totals.fuelToStability)}`,
    `Fuel needed to reserve: ${formatNumber(plan.totals.fuelToReserve)}`,
    `Uncovered critical gap: ${formatNumber(plan.dispatch.uncoveredStability)}`,
    `Uncovered reserve gap: ${formatNumber(plan.dispatch.uncoveredReserve)}`,
    `Arrival outage risk: ${plan.counts.arrivalRisk}`,
    `Trip-added arrival risk: ${plan.dispatch.tripTiming.additionalArrivalRisk}`,
    `Trip-degraded floor coverage: ${plan.dispatch.tripTiming.degradedStability}`,
    `Trip-degraded reserve coverage: ${plan.dispatch.tripTiming.degradedReserve}`,
    `Critical: ${plan.counts.critical}, Warning: ${plan.counts.warning}, Stable: ${plan.counts.stable}, Capacity-limited: ${plan.counts.capacityLimited}`,
  ];

  const rows = plan.dispatch.order.map((node) => [
    node.name,
    node.status.toUpperCase(),
    `priority ${formatPriority(node.priority)}`,
    `delay ${formatHourLabel(node.deliveryDelayHours)}`,
    `coverage ${formatHourLabel(node.stabilityHours)} floor / ${formatHourLabel(node.reserveHours)} reserve`,
    `remaining ${formatHourLabel(node.hoursRemaining)}`,
    `arrival ${formatHourLabel(node.hoursAtArrival)}`,
    `base outage ${formatOutageHours(node.outageHoursBeforeArrival)}`,
    `last drop ${node.allocatedFuel > 0 && plan.dispatch.tripCapacity !== null ? formatOffsetLabel(node.scheduledArrivalOffsetHours) : 'n/a'}`,
    `scheduled outage ${formatOutageHours(getDisplayOutageHours(plan, node))}`,
    `after ${formatHourLabel(getDisplayProjectedHours(plan, node))}`,
    `send ${formatNumber(node.allocatedFuel)}`,
    `${formatHourLabel(node.stabilityHours)} ${getDisplayStabilityGap(plan, node) > 0 ? `gap ${formatNumber(getDisplayStabilityGap(plan, node))}` : 'covered'}`,
    getDisplayRunsDry(plan, node) ? 'offline before scheduled drop' : `burns ${formatNumber(node.fuelConsumedBeforeArrival)} before arrival`,
    node.capacityLimited ? `reserve cap gap ${formatNumber(node.projectedShortfall)}` : 'reserve cap ok',
    getDisplayReserveGap(plan, node) > 0 ? `reserve gap ${formatNumber(getDisplayReserveGap(plan, node))}` : 'reserve covered',
  ].join(' | '));

  const tripRows = plan.dispatch.tripCapacity === null
    ? ['Trip manifests: set a trip capacity to generate them.']
    : plan.dispatch.trips.map((trip) => {
      const stops = trip.stops
        .map((stop) => {
          const parts = [
            `${stop.name} ${formatNumber(stop.fuel)}`,
            `arrives ${formatOffsetLabel(stop.arrivalOffsetHours)}`,
            `before ${formatNumber(stop.fuelBeforeArrival)}`,
            `after ${formatNumber(stop.fuelAfterDelivery)}`,
            `runtime ${formatHourLabel(stop.projectedHoursAfterDelivery)}`,
            stop.forStability > 0 ? `${formatNumber(stop.forStability)} floor` : null,
            stop.forReserve > 0 ? `${formatNumber(stop.forReserve)} reserve` : null,
            stop.remainingReserveGap > 0 ? `${formatNumber(stop.remainingReserveGap)} reserve gap` : 'reserve covered',
            stop.runsDryBeforeArrival ? `offline ${formatOutageHours(stop.outageHoursBeforeArrival)} before arrival` : null,
          ].filter(Boolean);
          return parts.join(' / ');
        })
        .join(' ; ');
      return `Trip ${trip.tripNumber} | depart ${formatOffsetLabel(trip.departureOffsetHours)} | load ${formatNumber(trip.fuel)} / ${formatNumber(trip.capacity)} | remaining ${formatNumber(trip.remainingCapacity)} | ${stops}`;
    });

  return [...header, '', 'Dispatch order:', ...rows, '', 'Trip manifests:', ...tripRows].join('\n');
}

export function buildNodeTableTsv(plan) {
  const headers = [
    'Node',
    'Status',
    'Priority',
    'DelayHours',
    'StabilityHours',
    'ReserveHours',
    'CurrentFuel',
    'MaxFuel',
    'BurnPerHour',
    'RuntimeNowHours',
    'RuntimeAtArrivalHours',
    'BaseOutageHours',
    'LastDropOffsetHours',
    'ScheduledOutageHours',
    'FuelToStability',
    'StabilityGap',
    'FuelToReserve',
    'CapacityGap',
    'AllocatedFuel',
    'AllocatedForStability',
    'AllocatedForReserve',
    'ReserveGap',
    'ProjectedHoursAfterDispatch',
    'RunsDryBeforeArrival',
    'ScheduledRunsDryBeforeArrival',
    'UsesTripCadence',
  ];

  const rows = plan.dispatch.order.map((node) => [
    node.name,
    node.status,
    node.priority,
    node.deliveryDelayHours,
    node.stabilityHours,
    node.reserveHours,
    node.currentFuel,
    node.maxFuel,
    node.burnRatePerHour,
    node.hoursRemaining,
    node.hoursAtArrival,
    node.outageHoursBeforeArrival,
    node.allocatedFuel > 0 && plan.dispatch.tripCapacity !== null ? node.scheduledArrivalOffsetHours : '',
    getDisplayOutageHours(plan, node),
    node.fuelToStability,
    getDisplayStabilityGap(plan, node),
    node.fuelToReserve,
    node.projectedShortfall,
    node.allocatedFuel,
    node.allocatedForStability,
    node.allocatedForReserve,
    getDisplayReserveGap(plan, node),
    getDisplayProjectedHours(plan, node),
    node.runsDryBeforeArrival,
    node.scheduledRunsDryBeforeArrival,
    Boolean(node.usesTripCadence),
  ]);

  return [headers, ...rows].map((row) => row.join('\t')).join('\n');
}

export function buildTripManifestTsv(plan) {
  const headers = [
    'TripNumber',
    'DepartureOffsetHours',
    'StopNumber',
    'Node',
    'Status',
    'Fuel',
    'ForStability',
    'ForReserve',
    'ArrivalOffsetHours',
    'FuelBeforeArrival',
    'FuelAfterDelivery',
    'ProjectedHoursAfterDelivery',
    'RemainingStabilityGap',
    'RemainingReserveGap',
    'OutageHoursBeforeArrival',
    'RunsDryBeforeArrival',
  ];

  const rows = plan.dispatch.trips.flatMap((trip) => trip.stops.map((stop, stopIndex) => [
    trip.tripNumber,
    trip.departureOffsetHours,
    stopIndex + 1,
    stop.name,
    stop.status,
    stop.fuel,
    stop.forStability,
    stop.forReserve,
    stop.arrivalOffsetHours,
    stop.fuelBeforeArrival,
    stop.fuelAfterDelivery,
    stop.projectedHoursAfterDelivery,
    stop.remainingStabilityGap,
    stop.remainingReserveGap,
    stop.outageHoursBeforeArrival,
    stop.runsDryBeforeArrival,
  ]));

  return [headers, ...rows].map((row) => row.join('\t')).join('\n');
}
