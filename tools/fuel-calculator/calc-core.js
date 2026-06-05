export const DEFAULT_RESERVE_HOURS = 24;
const HEADER_TOKENS = ['name', 'currentfuel', 'maxfuel', 'burnperhour'];

function toFiniteNumber(value) {
  const normalized = typeof value === 'string' ? value.trim() : value;
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

  return lines.flatMap((line, index) => {
    const parts = line.split(/[\t,]/).map((part) => part.trim());
    if (parts.length < 4) {
      throw new Error(`Row ${index + 1} must include name,currentFuel,maxFuel,burnPerHour`);
    }

    if (index === 0) {
      const normalizedHeader = parts
        .slice(0, 4)
        .map((part) => part.toLowerCase().replaceAll(/\s+/g, ''));
      if (normalizedHeader.every((part, headerIndex) => part === HEADER_TOKENS[headerIndex])) {
        return [];
      }
    }

    const [name, currentFuelRaw, maxFuelRaw, burnRateRaw] = parts;
    const currentFuel = toFiniteNumber(currentFuelRaw);
    const maxFuel = toFiniteNumber(maxFuelRaw);
    const burnRatePerHour = toFiniteNumber(burnRateRaw);

    if (!name) {
      throw new Error(`Row ${index + 1} is missing a node name`);
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
    if (currentFuel > maxFuel) {
      throw new Error(`Row ${index + 1} current fuel cannot exceed max fuel`);
    }

    return [{
      name,
      currentFuel,
      maxFuel,
      burnRatePerHour,
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

  const hoursDelta = left.hoursRemaining - right.hoursRemaining;
  if (hoursDelta !== 0) {
    return hoursDelta;
  }

  return right.fuelToReserve - left.fuelToReserve;
}

export function planFuel(nodes, reserveHours = DEFAULT_RESERVE_HOURS, availableFuel = Infinity) {
  const normalizedReserveHours = Math.max(0, toFiniteNumber(reserveHours) ?? DEFAULT_RESERVE_HOURS);
  const normalizedAvailableFuel = Math.max(0, toFiniteNumber(availableFuel) ?? Infinity);

  const perNode = nodes.map((node) => {
    const reserveFuel = node.burnRatePerHour * normalizedReserveHours;
    const hoursRemaining = node.burnRatePerHour === 0
      ? Number.POSITIVE_INFINITY
      : node.currentFuel / node.burnRatePerHour;
    const fuelToReserve = Math.max(0, reserveFuel - node.currentFuel);
    const fuelToFull = Math.max(0, node.maxFuel - node.currentFuel);
    const projectedShortfall = Math.max(0, reserveFuel - node.maxFuel);
    const status = node.burnRatePerHour === 0
      ? 'stable'
      : hoursRemaining < 12
        ? 'critical'
        : hoursRemaining < normalizedReserveHours
          ? 'warning'
          : 'stable';

    return {
      ...node,
      reserveHours: normalizedReserveHours,
      reserveFuel: roundTo(reserveFuel),
      hoursRemaining: Number.isFinite(hoursRemaining) ? roundTo(hoursRemaining) : Infinity,
      fuelToReserve: roundTo(fuelToReserve),
      fuelToFull: roundTo(fuelToFull),
      projectedShortfall: roundTo(projectedShortfall),
      status,
    };
  });

  let remainingDispatchFuel = normalizedAvailableFuel;
  const dispatchOrder = [...perNode]
    .sort(compareDispatchPriority)
    .map((node) => {
      const allocatedFuel = Math.min(node.fuelToReserve, remainingDispatchFuel);
      remainingDispatchFuel = roundTo(remainingDispatchFuel - allocatedFuel);
      const remainingReserveGap = roundTo(Math.max(0, node.fuelToReserve - allocatedFuel));

      return {
        name: node.name,
        status: node.status,
        hoursRemaining: node.hoursRemaining,
        fuelToReserve: node.fuelToReserve,
        allocatedFuel: roundTo(allocatedFuel),
        remainingReserveGap,
        canReachReserve: remainingReserveGap === 0,
      };
    });

  const totals = perNode.reduce(
    (accumulator, node) => ({
      currentFuel: roundTo(accumulator.currentFuel + node.currentFuel),
      maxFuel: roundTo(accumulator.maxFuel + node.maxFuel),
      reserveFuel: roundTo(accumulator.reserveFuel + node.reserveFuel),
      fuelToReserve: roundTo(accumulator.fuelToReserve + node.fuelToReserve),
      fuelToFull: roundTo(accumulator.fuelToFull + node.fuelToFull),
      projectedShortfall: roundTo(accumulator.projectedShortfall + node.projectedShortfall),
    }),
    {
      currentFuel: 0,
      maxFuel: 0,
      reserveFuel: 0,
      fuelToReserve: 0,
      fuelToFull: 0,
      projectedShortfall: 0,
    },
  );

  const counts = perNode.reduce(
    (accumulator, node) => {
      accumulator[node.status] += 1;
      return accumulator;
    },
    {
      critical: 0,
      warning: 0,
      stable: 0,
    },
  );

  const dispatch = dispatchOrder.reduce(
    (accumulator, node) => ({
      allocatedFuel: roundTo(accumulator.allocatedFuel + node.allocatedFuel),
      uncoveredReserve: roundTo(accumulator.uncoveredReserve + node.remainingReserveGap),
    }),
    {
      allocatedFuel: 0,
      uncoveredReserve: 0,
    },
  );

  return {
    reserveHours: normalizedReserveHours,
    availableFuel: Number.isFinite(normalizedAvailableFuel) ? normalizedAvailableFuel : null,
    perNode,
    totals,
    counts,
    dispatch: {
      ...dispatch,
      remainingFuel: Number.isFinite(normalizedAvailableFuel)
        ? roundTo(Math.max(0, normalizedAvailableFuel - dispatch.allocatedFuel))
        : null,
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
