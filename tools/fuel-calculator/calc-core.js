export const DEFAULT_RESERVE_HOURS = 24;
export const CRITICAL_STABILITY_HOURS = 12;
export const DEFAULT_DELIVERY_DELAY_HOURS = 0;
export const DEFAULT_TRIP_TURNAROUND_HOURS = 0;
export const DEFAULT_HAULER_COUNT = 1;
const HEADER_ALIASES = {
  name: ['name', 'node', 'nodename'],
  currentFuel: ['currentfuel', 'fuel', 'current', 'currentfuelunits'],
  currentFuelPercent: ['currentfuelpercent', 'fuelpercent', 'currentpercent', 'fillpercent', 'percentfull'],
  runtimeHours: ['hoursremaining', 'runtimehours', 'currentruntimehours', 'remaininghours', 'runtimeleft', 'timeleft'],
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
  const requiredFields = ['name', 'maxFuel', 'burnPerHour'];

  for (const field of requiredFields) {
    const columnIndex = normalizedParts.findIndex((part) => HEADER_ALIASES[field].includes(part));
    if (columnIndex === -1) {
      return null;
    }
    indexes[field] = columnIndex;
  }

  const currentFuelIndex = normalizedParts.findIndex((part) => HEADER_ALIASES.currentFuel.includes(part));
  if (currentFuelIndex !== -1) {
    indexes.currentFuel = currentFuelIndex;
  }

  const currentFuelPercentIndex = normalizedParts.findIndex((part) => HEADER_ALIASES.currentFuelPercent.includes(part));
  if (currentFuelPercentIndex !== -1) {
    indexes.currentFuelPercent = currentFuelPercentIndex;
  }

  const runtimeHoursIndex = normalizedParts.findIndex((part) => HEADER_ALIASES.runtimeHours.includes(part));
  if (runtimeHoursIndex !== -1) {
    indexes.runtimeHours = runtimeHoursIndex;
  }

  if (
    indexes.currentFuel === undefined
    && indexes.currentFuelPercent === undefined
    && indexes.runtimeHours === undefined
  ) {
    return null;
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
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }

    const normalized = trimmed.replaceAll(',', '').replaceAll('_', '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentValue(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.endsWith('%')) {
    return null;
  }

  return toFiniteNumber(trimmed.slice(0, -1));
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
    const currentFuelRaw = headerColumnIndexes && headerColumnIndexes.currentFuel !== undefined
      ? parts[headerColumnIndexes.currentFuel]
      : (headerColumnIndexes ? '' : parts[1]);
    const currentFuelPercentRaw = headerColumnIndexes && headerColumnIndexes.currentFuelPercent !== undefined
      ? parts[headerColumnIndexes.currentFuelPercent]
      : '';
    const runtimeHoursRaw = headerColumnIndexes && headerColumnIndexes.runtimeHours !== undefined
      ? parts[headerColumnIndexes.runtimeHours]
      : '';
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
    const maxFuel = toFiniteNumber(maxFuelRaw);
    const burnRatePerHour = toFiniteNumber(burnRateRaw);
    const currentFuelPercent = currentFuelPercentRaw === '' ? null : toFiniteNumber(currentFuelPercentRaw);
    const runtimeHours = runtimeHoursRaw === '' ? null : toFiniteNumber(runtimeHoursRaw);
    const inlinePercent = parsePercentValue(currentFuelRaw);
    const currentFuelCandidate = inlinePercent === null ? toFiniteNumber(currentFuelRaw) : null;
    const currentFuel = currentFuelCandidate
      ?? (inlinePercent !== null && maxFuel !== null ? roundTo((maxFuel * inlinePercent) / 100) : null)
      ?? (currentFuelPercent !== null && maxFuel !== null ? roundTo((maxFuel * currentFuelPercent) / 100) : null)
      ?? (runtimeHours !== null && burnRatePerHour !== null ? roundTo(runtimeHours * burnRatePerHour) : null);
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
    if (maxFuel === null || maxFuel <= 0) {
      throw new Error(`Row ${index + 1} has an invalid max fuel value`);
    }
    if (burnRatePerHour === null || burnRatePerHour < 0) {
      throw new Error(`Row ${index + 1} has an invalid burn-per-hour value`);
    }
    if (currentFuelCandidate === null && inlinePercent === null && currentFuelPercent === null && runtimeHours === null) {
      throw new Error(`Row ${index + 1} has an invalid current fuel value`);
    }
    if (inlinePercent !== null && (inlinePercent < 0 || inlinePercent > 100)) {
      throw new Error(`Row ${index + 1} has an invalid current fuel percent`);
    }
    if (currentFuelPercent !== null && (currentFuelPercent < 0 || currentFuelPercent > 100)) {
      throw new Error(`Row ${index + 1} has an invalid current fuel percent`);
    }
    if (runtimeHours !== null && runtimeHours < 0) {
      throw new Error(`Row ${index + 1} has an invalid runtime-hours value`);
    }
    if (runtimeHours !== null && burnRatePerHour === 0) {
      throw new Error(`Row ${index + 1} runtime-hours input requires burn-per-hour above zero`);
    }
    if (currentFuel === null || currentFuel < 0) {
      throw new Error(`Row ${index + 1} has an invalid current fuel value`);
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

function getTripDepartureOffsetHours(tripIndex, tripTurnaroundHours, haulerCount) {
  return roundTo(Math.floor(tripIndex / haulerCount) * tripTurnaroundHours);
}

function projectNodeArrival(node, state, arrivalOffsetHours) {
  const elapsedHours = Math.max(0, arrivalOffsetHours - state.lastArrivalOffsetHours);
  const burnSinceLastStop = Math.min(state.fuel, node.burnRatePerHour * elapsedHours);
  const fuelBeforeArrival = roundTo(Math.max(0, state.fuel - burnSinceLastStop));
  const runsDryBeforeArrival = node.burnRatePerHour > 0
    && state.fuel / node.burnRatePerHour < elapsedHours;
  const projectedHoursBeforeDelivery = node.burnRatePerHour === 0
    ? Number.POSITIVE_INFINITY
    : roundTo(fuelBeforeArrival / node.burnRatePerHour);

  return {
    fuelBeforeArrival,
    runsDryBeforeArrival,
    projectedHoursBeforeDelivery,
  };
}

function applyScheduledStop(node, state, arrivalOffsetHours, fuel) {
  const projection = projectNodeArrival(node, state, arrivalOffsetHours);
  const fuelAfterDelivery = roundTo(Math.min(node.maxFuel, projection.fuelBeforeArrival + fuel));
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
  state.scheduledRunsDryBeforeArrival = state.scheduledRunsDryBeforeArrival || projection.runsDryBeforeArrival;
  state.allocatedStops += 1;

  return {
    arrivalOffsetHours,
    fuelBeforeArrival: projection.fuelBeforeArrival,
    fuelAfterDelivery,
    projectedHoursAfterDelivery,
    remainingStabilityGap,
    remainingReserveGap,
    runsDryBeforeArrival: projection.runsDryBeforeArrival,
  };
}

function compareManifestCandidates(left, right, phase) {
  if (left.projection.runsDryBeforeArrival !== right.projection.runsDryBeforeArrival) {
    return left.projection.runsDryBeforeArrival ? -1 : 1;
  }

  const hoursDelta = left.projection.projectedHoursBeforeDelivery - right.projection.projectedHoursBeforeDelivery;
  if (hoursDelta !== 0) {
    return hoursDelta;
  }

  const priorityDelta = right.node.priority - left.node.priority;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const remainingFuelDelta = right.remainingFuel - left.remainingFuel;
  if (remainingFuelDelta !== 0) {
    return remainingFuelDelta;
  }

  if (phase === 'stability') {
    const stabilityNeedDelta = right.node.fuelToStability - left.node.fuelToStability;
    if (stabilityNeedDelta !== 0) {
      return stabilityNeedDelta;
    }
  } else {
    const reserveNeedDelta = right.node.fuelToReserve - left.node.fuelToReserve;
    if (reserveNeedDelta !== 0) {
      return reserveNeedDelta;
    }
  }

  return left.dispatchIndex - right.dispatchIndex;
}

export function buildDispatchTrips(
  dispatchOrder,
  tripCapacity,
  tripTurnaroundHours = DEFAULT_TRIP_TURNAROUND_HOURS,
  haulerCount = DEFAULT_HAULER_COUNT,
) {
  const normalizedTripCapacity = toFiniteNumber(tripCapacity);
  if (normalizedTripCapacity === null || normalizedTripCapacity <= 0) {
    return [];
  }
  const normalizedTripTurnaroundHours = Math.max(
    0,
    toFiniteNumber(tripTurnaroundHours) ?? DEFAULT_TRIP_TURNAROUND_HOURS,
  );
  const normalizedHaulerCount = Math.max(1, Math.floor(toFiniteNumber(haulerCount) ?? DEFAULT_HAULER_COUNT));
  const dispatchIndexMap = new Map(dispatchOrder.map((node, index) => [node.name, index]));
  const nodeMap = new Map(dispatchOrder.map((node) => [node.name, node]));
  const nodeStates = new Map(dispatchOrder.map((node) => [
    node.name,
    {
      fuel: node.currentFuel,
      lastArrivalOffsetHours: 0,
    },
  ]));

  const stabilitySegments = dispatchOrder
    .filter((node) => node.allocatedForStability > 0)
    .map((node) => ({
      name: node.name,
      status: node.status,
      remainingFuel: node.allocatedForStability,
      phase: 'stability',
    }));
  const reserveSegments = dispatchOrder
    .filter((node) => node.allocatedForReserve > 0)
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
        departureOffsetHours: getTripDepartureOffsetHours(
          trips.length,
          normalizedTripTurnaroundHours,
          normalizedHaulerCount,
        ),
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

  while (manifestSegments.some((segment) => segment.remainingFuel > 0)) {
    const trip = ensureTrip();
    const phase = stabilitySegments.some((segment) => segment.remainingFuel > 0) ? 'stability' : 'reserve';
    const candidateSegments = manifestSegments
      .filter((segment) => segment.phase === phase && segment.remainingFuel > 0)
      .map((segment) => {
        const node = nodeMap.get(segment.name);
        const arrivalOffsetHours = roundTo(trip.departureOffsetHours + node.deliveryDelayHours);

        return {
          ...segment,
          node,
          arrivalOffsetHours,
          dispatchIndex: dispatchIndexMap.get(segment.name) ?? Number.MAX_SAFE_INTEGER,
          projection: projectNodeArrival(node, nodeStates.get(segment.name), arrivalOffsetHours),
        };
      })
      .sort((left, right) => compareManifestCandidates(left, right, phase));

    if (candidateSegments.length === 0) {
      break;
    }

    const selectedSegment = candidateSegments[0];
    const amount = Math.min(trip.remainingCapacity, selectedSegment.remainingFuel);
    appendStop(trip, selectedSegment, amount);
    trip.fuel = roundTo(trip.fuel + amount);
    trip.remainingCapacity = roundTo(Math.max(0, trip.remainingCapacity - amount));

    const liveSegment = manifestSegments.find((segment) => (
      segment.name === selectedSegment.name && segment.phase === selectedSegment.phase
    ));
    if (liveSegment) {
      liveSegment.remainingFuel = roundTo(Math.max(0, liveSegment.remainingFuel - amount));
    }

    applyScheduledStop(
      selectedSegment.node,
      nodeStates.get(selectedSegment.name),
      selectedSegment.arrivalOffsetHours,
      amount,
    );

    if (trip.remainingCapacity <= 0) {
      activeTrip = null;
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
    departureOffsetHours: getTripDepartureOffsetHours(
      tripIndex,
      normalizedTripTurnaroundHours,
      normalizedHaulerCount,
    ),
    stops: trip.stops.map((stop) => {
      const node = nodeMap.get(stop.name);
      const state = nodeStates.get(stop.name);
      const arrivalOffsetHours = roundTo(
        getTripDepartureOffsetHours(tripIndex, normalizedTripTurnaroundHours, normalizedHaulerCount)
        + node.deliveryDelayHours,
      );
      const stopOutcome = applyScheduledStop(node, state, arrivalOffsetHours, stop.fuel);

      return {
        ...stop,
        ...stopOutcome,
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

  const trips = buildDispatchTrips(
    dispatchOrder,
    normalizedTripCapacity,
    normalizedTripTurnaroundHours,
    normalizedHaulerCount,
  );
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

