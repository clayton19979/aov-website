export const DEFAULT_RESERVE_HOURS = 24;
export const CRITICAL_STABILITY_HOURS = 12;
export const DEFAULT_DELIVERY_DELAY_HOURS = 0;
const HEADER_ALIASES = {
  name: ['name', 'node', 'nodename'],
  currentFuel: ['currentfuel', 'fuel', 'current', 'currentfuelunits'],
  maxFuel: ['maxfuel', 'capacity', 'fuelcapacity', 'maximumfuel'],
  burnPerHour: ['burnperhour', 'burnrate', 'burnrateperhour', 'usageperhour', 'consumptionperhour'],
  deliveryDelayHours: ['deliverydelayhours', 'delayhours', 'deliverydelay', 'travelhours', 'transithours'],
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
    const currentFuel = toFiniteNumber(currentFuelRaw);
    const maxFuel = toFiniteNumber(maxFuelRaw);
    const burnRatePerHour = toFiniteNumber(burnRateRaw);
    const hasDeliveryDelayValue = typeof deliveryDelayRaw === 'string'
      ? deliveryDelayRaw.trim() !== ''
      : deliveryDelayRaw !== undefined && deliveryDelayRaw !== null;
    const deliveryDelayHours = hasDeliveryDelayValue ? toFiniteNumber(deliveryDelayRaw) : null;

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

  const trips = [];
  let activeTrip = null;

  function ensureTrip() {
    if (!activeTrip || activeTrip.remainingCapacity <= 0) {
      activeTrip = {
        tripNumber: trips.length + 1,
        capacity: roundTo(normalizedTripCapacity),
        fuel: 0,
        remainingCapacity: roundTo(normalizedTripCapacity),
        stops: [],
      };
      trips.push(activeTrip);
    }

    return activeTrip;
  }

  for (const node of dispatchOrder) {
    let remainingStability = node.allocatedForStability;
    let remainingReserve = node.allocatedForReserve;

    while (remainingStability > 0 || remainingReserve > 0) {
      const trip = ensureTrip();
      const amount = Math.min(trip.remainingCapacity, remainingStability + remainingReserve);
      const forStability = Math.min(amount, remainingStability);
      const forReserve = roundTo(amount - forStability);

      trip.stops.push({
        name: node.name,
        status: node.status,
        fuel: roundTo(amount),
        forStability: roundTo(forStability),
        forReserve,
      });
      trip.fuel = roundTo(trip.fuel + amount);
      trip.remainingCapacity = roundTo(Math.max(0, trip.remainingCapacity - amount));

      remainingStability = roundTo(Math.max(0, remainingStability - forStability));
      remainingReserve = roundTo(Math.max(0, remainingReserve - forReserve));
    }
  }

  return trips;
}

export function planFuel(
  nodes,
  reserveHours = DEFAULT_RESERVE_HOURS,
  availableFuel = Infinity,
  stabilityHours = CRITICAL_STABILITY_HOURS,
  deliveryDelayHours = DEFAULT_DELIVERY_DELAY_HOURS,
  tripCapacity = null,
) {
  const normalizedReserveHours = Math.max(0, toFiniteNumber(reserveHours) ?? DEFAULT_RESERVE_HOURS);
  const normalizedAvailableFuel = Math.max(0, toFiniteNumber(availableFuel) ?? Infinity);
  const normalizedStabilityHours = Math.max(0, toFiniteNumber(stabilityHours) ?? CRITICAL_STABILITY_HOURS);
  const normalizedDeliveryDelayHours = Math.max(0, toFiniteNumber(deliveryDelayHours) ?? DEFAULT_DELIVERY_DELAY_HOURS);
  const normalizedTripCapacity = (() => {
    const parsed = toFiniteNumber(tripCapacity);
    return parsed !== null && parsed > 0 ? parsed : null;
  })();

  const perNode = nodes.map((node) => {
    const nodeDeliveryDelayHours = Math.max(
      0,
      toFiniteNumber(node.deliveryDelayHours) ?? normalizedDeliveryDelayHours,
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
    const stabilityFuel = node.burnRatePerHour * normalizedStabilityHours;
    const reserveFuel = node.burnRatePerHour * normalizedReserveHours;
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
      : hoursAtArrival < normalizedStabilityHours
        ? 'critical'
        : hoursAtArrival < normalizedReserveHours
          ? 'warning'
          : 'stable';

    return {
      ...node,
      stabilityHours: normalizedStabilityHours,
      reserveHours: normalizedReserveHours,
      deliveryDelayHours: roundTo(nodeDeliveryDelayHours),
      usesCustomDeliveryDelay: roundTo(nodeDeliveryDelayHours) !== normalizedDeliveryDelayHours,
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
        status: node.status,
        deliveryDelayHours: node.deliveryDelayHours,
        usesCustomDeliveryDelay: node.usesCustomDeliveryDelay,
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

  return {
    stabilityHours: normalizedStabilityHours,
    reserveHours: normalizedReserveHours,
    deliveryDelayHours: normalizedDeliveryDelayHours,
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
      tripCount: normalizedTripCapacity === null ? null : trips.length,
      trips,
      order: dispatchOrder,
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
