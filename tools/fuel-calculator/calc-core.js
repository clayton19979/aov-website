export const DEFAULT_RESERVE_HOURS = 24;

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
    .filter(Boolean);

  return lines.map((line, index) => {
    const parts = line.split(',').map((part) => part.trim());
    if (parts.length < 4) {
      throw new Error(`Row ${index + 1} must include name,currentFuel,maxFuel,burnPerHour`);
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

    return {
      name,
      currentFuel,
      maxFuel,
      burnRatePerHour,
    };
  });
}

export function planFuel(nodes, reserveHours = DEFAULT_RESERVE_HOURS) {
  const normalizedReserveHours = Math.max(0, toFiniteNumber(reserveHours) ?? DEFAULT_RESERVE_HOURS);

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

  return {
    reserveHours: normalizedReserveHours,
    perNode,
    totals,
    counts,
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
