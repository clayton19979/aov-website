export const DEFAULT_RESERVE_HOURS = 24;
export const CRITICAL_STABILITY_HOURS = 12;
export const DEFAULT_DELIVERY_DELAY_HOURS = 0;
export const DEFAULT_TRIP_TURNAROUND_HOURS = 0;
export const DEFAULT_HAULER_COUNT = 1;
const HEADER_ALIASES = {
  name: ['name', 'node', 'nodename'],
  currentFuel: ['currentfuel', 'fuel', 'current', 'currentfuelunits'],
  maxFuel: ['maxfuel', 'capacity', 'fuelcapacity', 'maximumfuel'],
  burnPerHour: ['burnperhour', 'burnrate', 'burnrateperhour', 'usageperhour', 'consumptionperhour'],
  deliveryDelayHours: ['deliverydelayhours', 'delayhours', 'deliverydelay', 'travelhours', 'transithours'],
  priority: ['priority', 'dispatchpriority', 'rank', 'importance'],
  stabilityHours: ['stabilityhours', 'criticalfloorhours', 'criticalhours', 'floorhours', 'stabilityfloorhours'],
  reserveHours: ['reservehours', 'reservewindowhours', 'targetreservehours', 'coveragehours'],
};

function parseDelimitedLine(line) {
  const delimiter = line.includes('\t') ? '\t' : ',';
  const parts = [];
  let currentPart = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const isEscapedQuote = insideQuotes && line[index + 1] === '"';
      if (isEscapedQuote) {
        currentPart += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      parts.push(currentPart.trim());
      currentPart = '';
      continue;
    }

    currentPart += character;
  }

  if (insideQuotes) {
    throw new Error('Input contains an unmatched quote');
  }

  parts.push(currentPart.trim());
  return parts;
}

function normalizeHeaderToken(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
}

function getHeaderColumnIndexes(parts) {
  const normalizedParts = parts.map((part) => normalizeHeaderToken(part));
  const indexes = {};
  const requiredFields = ['name', 'currentFuel', 'maxFuel', 'burnPerHour'];

  for (const field of requiredFields) {
    const columnIndex = normalizedParts.findIndex((part) => HEADER_ALIASES[field].includes(part));
    if (columnIndex === -1) {
      return null;
    }
    indexes[field] = columnIndex;
  }

  const deliveryDelayIndex = normalizedParts.findIndex((part) => HEADER_ALIASES.deliveryDelayHours.includes(part));
  if (deliveryDelayIndex !== -1) {
    indexes.deliveryDelayHours = deliveryDelayIndex;
  }

  const priorityIndex = normalizedParts.findIndex((part) => HEADER_ALIASES.priority.includes(part));
  if (priorityIndex !== -1) {
    indexes.priority = priorityIndex;
  }

  const stabilityHoursIndex = normalizedParts.findIndex((part) => HEADER_ALIASES.stabilityHours.includes(part));
  if (stabilityHoursIndex !== -1) {
    indexes.stabilityHours = stabilityHoursIndex;
  }

  const reserveHoursIndex = normalizedParts.findIndex((part) => HEADER_ALIASES.reserveHours.includes(part));
  if (reserveHoursIndex !== -1) {
    indexes.reserveHours = reserveHoursIndex;
  }

  return indexes;
}

function toFiniteNumber(value) {
  const normalized = typeof value === 'string'
    ? value.trim().replaceAll(',', '').replaceAll('_', '')
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundTo(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function parseNodeRows(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  let headerColumnIndexes = null;
  const seenNames = new Map();

  return lines.flatMap((line, index) => {
    const parts = parseDelimitedLine(line);
    if (parts.length < 4) {
      throw new Error(`Row ${index + 1} must include name,currentFuel,maxFuel,burnPerHour`);
    }

    if (index === 0) {
      headerColumnIndexes = getHeaderColumnIndexes(parts);
      if (headerColumnIndexes) {
        return [];
      }
    }

    const name = headerColumnIndexes ? parts[headerColumnIndexes.name] : parts[0];
    const currentFuelRaw = headerColumnIndexes ? parts[headerColumnIndexes.currentFuel] : parts[1];
    const maxFuelRaw = headerColumnIndexes ? parts[headerColumnIndexes.maxFuel] : parts[2];
    const burnRateRaw = headerColumnIndexes ? parts[headerColumnIndexes.burnPerHour] : parts[3];
    const deliveryDelayRaw = headerColumnIndexes
      ? (headerColumnIndexes.deliveryDelayHours !== undefined ? parts[headerColumnIndexes.deliveryDelayHours] : '')
      : (parts[4] ?? '');
    const priorityRaw = headerColumnIndexes
      ? (headerColumnIndexes.priority !== undefined ? parts[headerColumnIndexes.priority] : '')
      : (parts[5] ?? '');
    const stabilityHoursRaw = headerColumnIndexes
      ? (headerColumnIndexes.stabilityHours !== undefined ? parts[headerColumnIndexes.stabilityHours] : '')
      : (parts[6] ?? '');
    const reserveHoursRaw = headerColumnIndexes
      ? (headerColumnIndexes.reserveHours !== undefined ? parts[headerColumnIndexes.reserveHours] : '')
      : (parts[7] ?? '');
    const currentFuel = toFiniteNumber(currentFuelRaw);
    const maxFuel = toFiniteNumber(maxFuelRaw);
    const burnRatePerHour = toFiniteNumber(burnRateRaw);
    const hasDeliveryDelayValue = typeof deliveryDelayRaw === 'string'
      ? deliveryDelayRaw.trim() !== ''
      : deliveryDelayRaw !== undefined && deliveryDelayRaw !== null;
    const deliveryDelayHours = hasDeliveryDelayValue ? toFiniteNumber(deliveryDelayRaw) : null;
    const hasPriorityValue = typeof priorityRaw === 'string'
      ? priorityRaw.trim() !== ''
      : priorityRaw !== undefined && priorityRaw !== null;
    const priority = hasPriorityValue ? toFiniteNumber(priorityRaw) : null;
    const hasStabilityHoursValue = typeof stabilityHoursRaw === 'string'
      ? stabilityHoursRaw.trim() !== ''
      : stabilityHoursRaw !== undefined && stabilityHoursRaw !== null;
    const stabilityHours = hasStabilityHoursValue ? toFiniteNumber(stabilityHoursRaw) : null;
    const hasReserveHoursValue = typeof reserveHoursRaw === 'string'
      ? reserveHoursRaw.trim() !== ''
      : reserveHoursRaw !== undefined && reserveHoursRaw !== null;
    const reserveHours = hasReserveHoursValue ? toFiniteNumber(reserveHoursRaw) : null;

    if (!name) {
      throw new Error(`Row ${index + 1} is missing a node name`);
    }
    const normalizedName = name.trim().toLowerCase();
    const firstSeenRow = seenNames.get(normalizedName);
    if (firstSeenRow !== undefined) {
      throw new Error(`Row ${index + 1} duplicates node "${name}" from row ${firstSeenRow}`);
    }
    if (currentFuel === null || currentFuel < 0) {
      throw new Error(`Row ${index + 1} has an invalid current fuel value`);
    }
    if (maxFuel === null || maxFuel <= 0) {
      throw new Error(`Row ${index + 1} has an invalid max fuel value`);
    }
    if (burnRatePerHour === null || burnRatePerHour < 0) {
      throw new Error(`Row ${index + 1} has an invalid burn-per-hour value`);
    }
    if (hasDeliveryDelayValue && (deliveryDelayHours === null || deliveryDelayHours < 0)) {
      throw new Error(`Row ${index + 1} has an invalid delivery delay value`);
    }
    if (hasPriorityValue && (priority === null || priority < 0)) {
      throw new Error(`Row ${index + 1} has an invalid priority value`);
    }
    if (hasStabilityHoursValue && (stabilityHours === null || stabilityHours < 0)) {
      throw new Error(`Row ${index + 1} has an invalid stability-hours value`);
    }
    if (hasReserveHoursValue && (reserveHours === null || reserveHours < 0)) {
      throw new Error(`Row ${index + 1} has an invalid reserve-hours value`);
    }
    if (currentFuel > maxFuel) {
      throw new Error(`Row ${index + 1} current fuel cannot exceed max fuel`);
    }

    seenNames.set(normalizedName, index + 1);

    return [{
      name,
      currentFuel,
      maxFuel,
      burnRatePerHour,
      ...(deliveryDelayHours !== null ? { deliveryDelayHours } : {}),
      ...(priority !== null ? { priority } : {}),
      ...(stabilityHours !== null ? { stabilityHours } : {}),
      ...(reserveHours !== null ? { reserveHours } : {}),
    }];
  });
}

function getStatusPriority(status) {
  switch (status) {
    case 'critical':
      return 0;
    case 'warning':
      return 1;
    default:
      return 2;
  }
}

function compareDispatchPriority(left, right) {
  const statusDelta = getStatusPriority(left.status) - getStatusPriority(right.status);
  if (statusDelta !== 0) {
    return statusDelta;
  }

  const priorityDelta = right.priority - left.priority;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const hoursDelta = left.hoursAtArrival - right.hoursAtArrival;
  if (hoursDelta !== 0) {
    return hoursDelta;
  }

  return right.fuelToReserve - left.fuelToReserve;
}

export function buildDispatchTrips(dispatchOrder, tripCapacity) {
  const normalizedTripCapacity = toFiniteNumber(tripCapacity);
  if (normalizedTripCapacity === null || normalizedTripCapacity <= 0) {
    return [];
  }

  const stabilitySegments = dispatchOrder
    .filter((node) => node.allocatedForStability > 0)
    .sort((left, right) => {
      const priorityDelta = right.priority - left.priority;
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const hoursDelta = left.hoursAtArrival - right.hoursAtArrival;
      if (hoursDelta !== 0) {
        return hoursDelta;
      }

      return right.allocatedForStability - left.allocatedForStability;
    })
    .map((node) => ({
      name: node.name,
      status: node.status,
      remainingFuel: node.allocatedForStability,
      phase: 'stability',
    }));
  const reserveSegments = dispatchOrder
    .filter((node) => node.allocatedForReserve > 0)
    .sort(compareDispatchPriority)
    .map((node) => ({
      name: node.name,
      status: node.status,
      remainingFuel: node.allocatedForReserve,
      phase: 'reserve',
    }));
  const manifestSegments = [...stabilitySegments, ...reserveSegments];
  const trips = [];
  let activeTrip = null;

  function ensureTrip() {
    if (!activeTrip || activeTrip.remainingCapacity <= 0) {
      activeTrip = {
        tripNumber: trips.length + 1,
        capacity: roundTo(normalizedTripCapacity),
        fuel: 0,
        remainingCapacity: roundTo(normalizedTripCapacity),
        departureOffsetHours: 0,
        stops: [],
      };
      trips.push(activeTrip);
    }

    return activeTrip;
  }

  function appendStop(trip, segment, amount) {
    const forStability = segment.phase === 'stability' ? amount : 0;
    const forReserve = roundTo(amount - forStability);
    const lastStop = trip.stops[trip.stops.length - 1];

    if (lastStop && lastStop.name === segment.name && lastStop.status === segment.status) {
      lastStop.fuel = roundTo(lastStop.fuel + amount);
      lastStop.forStability = roundTo(lastStop.forStability + forStability);
      lastStop.forReserve = roundTo(lastStop.forReserve + forReserve);
      return;
    }

    trip.stops.push({
      name: segment.name,
      status: segment.status,
      fuel: roundTo(amount),
      forStability: roundTo(forStability),
      forReserve,
    });
  }

  for (const segment of manifestSegments) {
    while (segment.remainingFuel > 0) {
      const trip = ensureTrip();
      const amount = Math.min(trip.remainingCapacity, segment.remainingFuel);
      appendStop(trip, segment, amount);
      trip.fuel = roundTo(trip.fuel + amount);
      trip.remainingCapacity = roundTo(Math.max(0, trip.remainingCapacity - amount));
      segment.remainingFuel = roundTo(Math.max(0, segment.remainingFuel - amount));
    }
  }

  return trips;
}

function applyTripSchedule(
  dispatchOrder,
  trips,
  tripTurnaroundHours = DEFAULT_TRIP_TURNAROUND_HOURS,
  haulerCount = DEFAULT_HAULER_COUNT,
) {
  const normalizedTripTurnaroundHours = Math.max(
    0,
    toFiniteNumber(tripTurnaroundHours) ?? DEFAULT_TRIP_TURNAROUND_HOURS,
  );
  const normalizedHaulerCount = Math.max(1, Math.floor(toFiniteNumber(haulerCount) ?? DEFAULT_HAULER_COUNT));
  const nodeMap = new Map(dispatchOrder.map((node) => [node.name, node]));
  const nodeStates = new Map(dispatchOrder.map((node) => [
    node.name,
    {
      fuel: node.currentFuel,
      lastArrivalOffsetHours: 0,
      lastProjectedHoursAfterDelivery: node.projectedHoursAfterDispatch,
      remainingStabilityGap: node.remainingStabilityGap,
      remainingReserveGap: node.remainingReserveGap,
      scheduledArrivalOffsetHours: node.deliveryDelayHours,
      scheduledRunsDryBeforeArrival: node.runsDryBeforeArrival,
      allocatedStops: 0,
    },
  ]));

  const scheduledTrips = trips.map((trip, tripIndex) => ({
    ...trip,
    departureOffsetHours: roundTo(Math.floor(tripIndex / normalizedHaulerCount) * normalizedTripTurnaroundHours),
    stops: trip.stops.map((stop) => {
      const node = nodeMap.get(stop.name);
      const state = nodeStates.get(stop.name);
      const arrivalOffsetHours = roundTo(
        (Math.floor(tripIndex / normalizedHaulerCount) * normalizedTripTurnaroundHours) + node.deliveryDelayHours,
      );
      const elapsedHours = Math.max(0, arrivalOffsetHours - state.lastArrivalOffsetHours);
      const burnSinceLastStop = Math.min(state.fuel, node.burnRatePerHour * elapsedHours);
      const fuelBeforeArrival = roundTo(Math.max(0, state.fuel - burnSinceLastStop));
      const runsDryBeforeArrival = node.burnRatePerHour > 0
        && state.fuel / node.burnRatePerHour < elapsedHours;
      const fuelAfterDelivery = roundTo(Math.min(node.maxFuel, fuelBeforeArrival + stop.fuel));
      const projectedHoursAfterDelivery = node.burnRatePerHour === 0
        ? Number.POSITIVE_INFINITY
        : roundTo(fuelAfterDelivery / node.burnRatePerHour);
      const remainingStabilityGap = roundTo(Math.max(0, node.stabilityFuel - fuelAfterDelivery));
      const remainingReserveGap = roundTo(Math.max(0, node.reserveFuel - fuelAfterDelivery));

      state.fuel = fuelAfterDelivery;
      state.lastArrivalOffsetHours = arrivalOffsetHours;
      state.lastProjectedHoursAfterDelivery = projectedHoursAfterDelivery;
      state.remainingStabilityGap = remainingStabilityGap;
      state.remainingReserveGap = remainingReserveGap;
      state.scheduledArrivalOffsetHours = arrivalOffsetHours;
      state.scheduledRunsDryBeforeArrival = state.scheduledRunsDryBeforeArrival || runsDryBeforeArrival;
      state.allocatedStops += 1;

      return {
        ...stop,
        arrivalOffsetHours,
        fuelBeforeArrival,
        fuelAfterDelivery,
        projectedHoursAfterDelivery,
        remainingStabilityGap,
        remainingReserveGap,
        runsDryBeforeArrival,
      };
    }),
  }));

  const outcomes = dispatchOrder.map((node) => {
    const state = nodeStates.get(node.name);
    const usesTripCadence = state.allocatedStops > 0
      && (state.allocatedStops > 1 || state.scheduledArrivalOffsetHours !== node.deliveryDelayHours);

    return {
      name: node.name,
      scheduledArrivalOffsetHours: state.scheduledArrivalOffsetHours,
      scheduledProjectedHoursAfterDispatch: state.lastProjectedHoursAfterDelivery,
      scheduledRemainingStabilityGap: state.remainingStabilityGap,
      scheduledRemainingReserveGap: state.remainingReserveGap,
      scheduledRunsDryBeforeArrival: state.scheduledRunsDryBeforeArrival,
      usesTripCadence,
    };
  });

  const counts = outcomes.reduce(
    (accumulator, outcome) => {
      const node = nodeMap.get(outcome.name);
      if (outcome.usesTripCadence) {
        accumulator.nodesAffected += 1;
      }
      if (outcome.scheduledRunsDryBeforeArrival && !node.runsDryBeforeArrival) {
        accumulator.additionalArrivalRisk += 1;
      }
      if (outcome.scheduledRemainingStabilityGap > node.remainingStabilityGap) {
        accumulator.degradedStability += 1;
      }
      if (outcome.scheduledRemainingReserveGap > node.remainingReserveGap) {
        accumulator.degradedReserve += 1;
      }
      return accumulator;
    },
    {
      nodesAffected: 0,
      additionalArrivalRisk: 0,
      degradedStability: 0,
      degradedReserve: 0,
    },
  );

  return { trips: scheduledTrips, outcomes, counts };
}

export function planFuel(
  nodes,
  reserveHours = DEFAULT_RESERVE_HOURS,
  availableFuel = Infinity,
  stabilityHours = CRITICAL_STABILITY_HOURS,
  deliveryDelayHours = DEFAULT_DELIVERY_DELAY_HOURS,
  tripCapacity = null,
  tripTurnaroundHours = DEFAULT_TRIP_TURNAROUND_HOURS,
  haulerCount = DEFAULT_HAULER_COUNT,
) {
  const normalizedReserveHours = Math.max(0, toFiniteNumber(reserveHours) ?? DEFAULT_RESERVE_HOURS);
  const normalizedAvailableFuel = Math.max(0, toFiniteNumber(availableFuel) ?? Infinity);
  const normalizedStabilityHours = Math.max(0, toFiniteNumber(stabilityHours) ?? CRITICAL_STABILITY_HOURS);
  const normalizedDeliveryDelayHours = Math.max(0, toFiniteNumber(deliveryDelayHours) ?? DEFAULT_DELIVERY_DELAY_HOURS);
  const normalizedTripCapacity = (() => {
    const parsed = toFiniteNumber(tripCapacity);
    return parsed !== null && parsed > 0 ? parsed : null;
  })();
  const normalizedTripTurnaroundHours = Math.max(
    0,
    toFiniteNumber(tripTurnaroundHours) ?? DEFAULT_TRIP_TURNAROUND_HOURS,
  );
  const normalizedHaulerCount = Math.max(1, Math.floor(toFiniteNumber(haulerCount) ?? DEFAULT_HAULER_COUNT));

  const perNode = nodes.map((node) => {
    const nodeDeliveryDelayHours = Math.max(
      0,
      toFiniteNumber(node.deliveryDelayHours) ?? normalizedDeliveryDelayHours,
    );
    const nodePriority = Math.max(0, toFiniteNumber(node.priority) ?? 0);
    const nodeStabilityHours = Math.max(
      0,
      toFiniteNumber(node.stabilityHours) ?? normalizedStabilityHours,
    );
    const nodeReserveHours = Math.max(
      0,
      toFiniteNumber(node.reserveHours) ?? normalizedReserveHours,
    );
    const hoursRemaining = node.burnRatePerHour === 0
      ? Number.POSITIVE_INFINITY
      : node.currentFuel / node.burnRatePerHour;
    const fuelConsumedBeforeArrival = Math.min(
      node.currentFuel,
      node.burnRatePerHour * nodeDeliveryDelayHours,
    );
    const fuelAtArrival = Math.max(0, node.currentFuel - fuelConsumedBeforeArrival);
    const hoursAtArrival = node.burnRatePerHour === 0
      ? Number.POSITIVE_INFINITY
      : Math.max(0, hoursRemaining - nodeDeliveryDelayHours);
    const stabilityFuel = node.burnRatePerHour * nodeStabilityHours;
    const reserveFuel = node.burnRatePerHour * nodeReserveHours;
    const reachableStabilityFuel = Math.min(node.maxFuel, stabilityFuel);
    const reachableReserveFuel = Math.min(node.maxFuel, reserveFuel);
    const fuelToStability = Math.max(0, reachableStabilityFuel - fuelAtArrival);
    const fuelToReserve = Math.max(0, reserveFuel - fuelAtArrival);
    const fuelToDeliver = Math.max(0, reachableReserveFuel - fuelAtArrival);
    const fuelToFull = Math.max(0, node.maxFuel - node.currentFuel);
    const projectedStabilityShortfall = Math.max(0, stabilityFuel - node.maxFuel);
    const projectedShortfall = Math.max(0, reserveFuel - node.maxFuel);
    const runsDryBeforeArrival = node.burnRatePerHour > 0 && hoursRemaining < nodeDeliveryDelayHours;
    const status = node.burnRatePerHour === 0
      ? 'stable'
      : hoursAtArrival < nodeStabilityHours
        ? 'critical'
        : hoursAtArrival < nodeReserveHours
          ? 'warning'
          : 'stable';

    return {
      ...node,
      stabilityHours: roundTo(nodeStabilityHours),
      reserveHours: roundTo(nodeReserveHours),
      deliveryDelayHours: roundTo(nodeDeliveryDelayHours),
      usesCustomStabilityHours: roundTo(nodeStabilityHours) !== normalizedStabilityHours,
      usesCustomReserveHours: roundTo(nodeReserveHours) !== normalizedReserveHours,
      usesCustomDeliveryDelay: roundTo(nodeDeliveryDelayHours) !== normalizedDeliveryDelayHours,
      priority: roundTo(nodePriority),
      usesCustomPriority: nodePriority > 0,
      stabilityFuel: roundTo(stabilityFuel),
      reserveFuel: roundTo(reserveFuel),
      hoursRemaining: Number.isFinite(hoursRemaining) ? roundTo(hoursRemaining) : Infinity,
      hoursAtArrival: Number.isFinite(hoursAtArrival) ? roundTo(hoursAtArrival) : Infinity,
      fuelConsumedBeforeArrival: roundTo(fuelConsumedBeforeArrival),
      fuelAtArrival: roundTo(fuelAtArrival),
      fuelToStability: roundTo(fuelToStability),
      fuelToReserve: roundTo(fuelToReserve),
      fuelToDeliver: roundTo(fuelToDeliver),
      fuelToFull: roundTo(fuelToFull),
      projectedStabilityShortfall: roundTo(projectedStabilityShortfall),
      projectedShortfall: roundTo(projectedShortfall),
      runsDryBeforeArrival,
      survivesUntilArrival: !runsDryBeforeArrival,
      status,
    };
  });

  let remainingDispatchFuel = normalizedAvailableFuel;
  const dispatchAllocations = new Map(perNode.map((node) => [node.name, { stability: 0, reserve: 0 }]));

  const stabilityOrder = [...perNode]
    .filter((node) => node.status === 'critical' && node.fuelToStability > 0)
    .sort((left, right) => {
      const priorityDelta = right.priority - left.priority;
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const hoursDelta = left.hoursAtArrival - right.hoursAtArrival;
      if (hoursDelta !== 0) {
        return hoursDelta;
      }

      return right.fuelToStability - left.fuelToStability;
    });

  for (const node of stabilityOrder) {
    const allocatedFuel = Math.min(node.fuelToStability, remainingDispatchFuel);
    remainingDispatchFuel = roundTo(remainingDispatchFuel - allocatedFuel);
    dispatchAllocations.get(node.name).stability = roundTo(allocatedFuel);
  }

  const dispatchOrder = [...perNode]
    .sort(compareDispatchPriority)
    .map((node) => {
      const dispatchAllocation = dispatchAllocations.get(node.name);
      const remainingReserveNeed = Math.max(0, node.fuelToDeliver - dispatchAllocation.stability);
      const reserveAllocation = Math.min(remainingReserveNeed, remainingDispatchFuel);
      remainingDispatchFuel = roundTo(remainingDispatchFuel - reserveAllocation);
      dispatchAllocation.reserve = roundTo(reserveAllocation);

      const allocatedFuel = roundTo(dispatchAllocation.stability + dispatchAllocation.reserve);
      const remainingStabilitySupplyGap = roundTo(Math.max(0, node.fuelToStability - allocatedFuel));
      const remainingStabilityGap = roundTo(node.projectedStabilityShortfall + remainingStabilitySupplyGap);
      const remainingSupplyGap = roundTo(Math.max(0, node.fuelToDeliver - allocatedFuel));
      const remainingReserveGap = roundTo(node.projectedShortfall + remainingSupplyGap);
      const projectedHoursAfterArrival = node.burnRatePerHour === 0
        ? Number.POSITIVE_INFINITY
        : roundTo((node.fuelAtArrival + allocatedFuel) / node.burnRatePerHour);
      const projectedHoursAfterDispatch = node.burnRatePerHour === 0
        ? Number.POSITIVE_INFINITY
        : roundTo(node.deliveryDelayHours + projectedHoursAfterArrival);

      return {
        name: node.name,
        currentFuel: node.currentFuel,
        maxFuel: node.maxFuel,
        burnRatePerHour: node.burnRatePerHour,
        stabilityFuel: node.stabilityFuel,
        reserveFuel: node.reserveFuel,
        status: node.status,
        stabilityHours: node.stabilityHours,
        reserveHours: node.reserveHours,
        deliveryDelayHours: node.deliveryDelayHours,
        usesCustomStabilityHours: node.usesCustomStabilityHours,
        usesCustomReserveHours: node.usesCustomReserveHours,
        usesCustomDeliveryDelay: node.usesCustomDeliveryDelay,
        priority: node.priority,
        usesCustomPriority: node.usesCustomPriority,
        hoursRemaining: node.hoursRemaining,
        hoursAtArrival: node.hoursAtArrival,
        projectedHoursAfterDispatch,
        projectedHoursAfterArrival,
        fuelConsumedBeforeArrival: node.fuelConsumedBeforeArrival,
        fuelAtArrival: node.fuelAtArrival,
        fuelToStability: node.fuelToStability,
        fuelToReserve: node.fuelToReserve,
        fuelToDeliver: node.fuelToDeliver,
        allocatedFuel,
        allocatedForStability: dispatchAllocation.stability,
        allocatedForReserve: dispatchAllocation.reserve,
        projectedStabilityShortfall: node.projectedStabilityShortfall,
        projectedShortfall: node.projectedShortfall,
        stabilityCapacityLimited: node.projectedStabilityShortfall > 0,
        capacityLimited: node.projectedShortfall > 0,
        runsDryBeforeArrival: node.runsDryBeforeArrival,
        survivesUntilArrival: node.survivesUntilArrival,
        remainingStabilityGap,
        remainingSupplyGap,
        remainingReserveGap,
        canReachStability: remainingStabilityGap === 0,
        canReachReserve: remainingReserveGap === 0,
        scheduledArrivalOffsetHours: node.deliveryDelayHours,
        scheduledProjectedHoursAfterDispatch: projectedHoursAfterDispatch,
        scheduledRemainingStabilityGap: remainingStabilityGap,
        scheduledRemainingReserveGap: remainingReserveGap,
        scheduledRunsDryBeforeArrival: node.runsDryBeforeArrival,
        usesTripCadence: false,
      };
    });

  const totals = perNode.reduce(
    (accumulator, node) => ({
      currentFuel: roundTo(accumulator.currentFuel + node.currentFuel),
      maxFuel: roundTo(accumulator.maxFuel + node.maxFuel),
      stabilityFuel: roundTo(accumulator.stabilityFuel + node.stabilityFuel),
      reserveFuel: roundTo(accumulator.reserveFuel + node.reserveFuel),
      fuelConsumedBeforeArrival: roundTo(accumulator.fuelConsumedBeforeArrival + node.fuelConsumedBeforeArrival),
      fuelAtArrival: roundTo(accumulator.fuelAtArrival + node.fuelAtArrival),
      fuelToStability: roundTo(accumulator.fuelToStability + node.fuelToStability),
      fuelToReserve: roundTo(accumulator.fuelToReserve + node.fuelToReserve),
      fuelToDeliver: roundTo(accumulator.fuelToDeliver + node.fuelToDeliver),
      fuelToFull: roundTo(accumulator.fuelToFull + node.fuelToFull),
      projectedStabilityShortfall: roundTo(accumulator.projectedStabilityShortfall + node.projectedStabilityShortfall),
      projectedShortfall: roundTo(accumulator.projectedShortfall + node.projectedShortfall),
    }),
    {
      currentFuel: 0,
      maxFuel: 0,
      stabilityFuel: 0,
      reserveFuel: 0,
      fuelConsumedBeforeArrival: 0,
      fuelAtArrival: 0,
      fuelToStability: 0,
      fuelToReserve: 0,
      fuelToDeliver: 0,
      fuelToFull: 0,
      projectedStabilityShortfall: 0,
      projectedShortfall: 0,
    },
  );

  const counts = perNode.reduce(
    (accumulator, node) => {
      accumulator[node.status] += 1;
      if (node.runsDryBeforeArrival) {
        accumulator.arrivalRisk += 1;
      }
      if (node.projectedShortfall > 0) {
        accumulator.capacityLimited += 1;
      }
      if (node.projectedStabilityShortfall > 0) {
        accumulator.stabilityCapacityLimited += 1;
      }
      if (node.usesCustomDeliveryDelay) {
        accumulator.customDeliveryDelay += 1;
      }
      if (node.usesCustomPriority) {
        accumulator.customPriority += 1;
      }
      if (node.usesCustomStabilityHours) {
        accumulator.customStabilityHours += 1;
      }
      if (node.usesCustomReserveHours) {
        accumulator.customReserveHours += 1;
      }
      return accumulator;
    },
    {
      critical: 0,
      warning: 0,
      stable: 0,
      arrivalRisk: 0,
      capacityLimited: 0,
      stabilityCapacityLimited: 0,
      customDeliveryDelay: 0,
      customPriority: 0,
      customStabilityHours: 0,
      customReserveHours: 0,
    },
  );

  const dispatch = dispatchOrder.reduce(
    (accumulator, node) => ({
      allocatedForStability: roundTo(accumulator.allocatedForStability + node.allocatedForStability),
      allocatedFuel: roundTo(accumulator.allocatedFuel + node.allocatedFuel),
      uncoveredStability: roundTo(accumulator.uncoveredStability + node.remainingStabilityGap),
      uncoveredReserve: roundTo(accumulator.uncoveredReserve + node.remainingReserveGap),
    }),
    {
      allocatedForStability: 0,
      allocatedFuel: 0,
      uncoveredStability: 0,
      uncoveredReserve: 0,
    },
  );

  const trips = buildDispatchTrips(dispatchOrder, normalizedTripCapacity);
  const tripSchedule = normalizedTripCapacity === null
    ? {
      trips,
      outcomes: [],
      counts: {
        nodesAffected: 0,
        additionalArrivalRisk: 0,
        degradedStability: 0,
        degradedReserve: 0,
      },
    }
    : applyTripSchedule(dispatchOrder, trips, normalizedTripTurnaroundHours, normalizedHaulerCount);
  const scheduledOutcomeMap = new Map(tripSchedule.outcomes.map((outcome) => [outcome.name, outcome]));
  const scheduledDispatchOrder = dispatchOrder.map((node) => ({
    ...node,
    ...(scheduledOutcomeMap.get(node.name) ?? {}),
  }));

  return {
    stabilityHours: normalizedStabilityHours,
    reserveHours: normalizedReserveHours,
    deliveryDelayHours: normalizedDeliveryDelayHours,
    tripTurnaroundHours: normalizedTripTurnaroundHours,
    haulerCount: normalizedHaulerCount,
    availableFuel: Number.isFinite(normalizedAvailableFuel) ? normalizedAvailableFuel : null,
    perNode,
    totals,
    counts,
    dispatch: {
      ...dispatch,
      remainingFuel: Number.isFinite(normalizedAvailableFuel)
        ? roundTo(Math.max(0, normalizedAvailableFuel - dispatch.allocatedFuel))
        : null,
      tripCapacity: normalizedTripCapacity,
      tripTurnaroundHours: normalizedTripCapacity === null ? null : normalizedTripTurnaroundHours,
      haulerCount: normalizedTripCapacity === null ? null : normalizedHaulerCount,
      tripCount: normalizedTripCapacity === null ? null : tripSchedule.trips.length,
      tripTiming: tripSchedule.counts,
      trips: tripSchedule.trips,
      order: scheduledDispatchOrder,
    },
  };
}

export function formatHours(hours) {
  if (!Number.isFinite(hours)) {
    return 'Unlimited';
  }
  if (hours < 24) {
    return `${roundTo(hours)}h`;
  }

  const days = Math.floor(hours / 24);
  const remHours = roundTo(hours - (days * 24));
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}

