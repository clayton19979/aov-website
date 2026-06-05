export const DEFAULT_RESERVE_HOURS = 24;
export const CRITICAL_STABILITY_HOURS = 12;
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
    const stabilityFuel = node.burnRatePerHour * CRITICAL_STABILITY_HOURS;
    const reserveFuel = node.burnRatePerHour * normalizedReserveHours;
    const hoursRemaining = node.burnRatePerHour === 0
      ? Number.POSITIVE_INFINITY
      : node.currentFuel / node.burnRatePerHour;
    const reachableStabilityFuel = Math.min(node.maxFuel, stabilityFuel);
    const reachableReserveFuel = Math.min(node.maxFuel, reserveFuel);
    const fuelToStability = Math.max(0, reachableStabilityFuel - node.currentFuel);
    const fuelToReserve = Math.max(0, reserveFuel - node.currentFuel);
    const fuelToDeliver = Math.max(0, reachableReserveFuel - node.currentFuel);
    const fuelToFull = Math.max(0, node.maxFuel - node.currentFuel);
    const projectedStabilityShortfall = Math.max(0, stabilityFuel - node.maxFuel);
    const projectedShortfall = Math.max(0, reserveFuel - node.maxFuel);
    const status = node.burnRatePerHour === 0
      ? 'stable'
      : hoursRemaining < CRITICAL_STABILITY_HOURS
        ? 'critical'
        : hoursRemaining < normalizedReserveHours
          ? 'warning'
          : 'stable';

    return {
      ...node,
      stabilityHours: CRITICAL_STABILITY_HOURS,
      reserveHours: normalizedReserveHours,
      stabilityFuel: roundTo(stabilityFuel),
      reserveFuel: roundTo(reserveFuel),
      hoursRemaining: Number.isFinite(hoursRemaining) ? roundTo(hoursRemaining) : Infinity,
      fuelToStability: roundTo(fuelToStability),
      fuelToReserve: roundTo(fuelToReserve),
      fuelToDeliver: roundTo(fuelToDeliver),
      fuelToFull: roundTo(fuelToFull),
      projectedStabilityShortfall: roundTo(projectedStabilityShortfall),
      projectedShortfall: roundTo(projectedShortfall),
      status,
    };
  });

  let remainingDispatchFuel = normalizedAvailableFuel;
  const dispatchAllocations = new Map(perNode.map((node) => [node.name, { stability: 0, reserve: 0 }]));

  const stabilityOrder = [...perNode]
    .filter((node) => node.status === 'critical' && node.fuelToStability > 0)
    .sort((left, right) => {
      const hoursDelta = left.hoursRemaining - right.hoursRemaining;
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
      const projectedHoursAfterDispatch = node.burnRatePerHour === 0
        ? Number.POSITIVE_INFINITY
        : roundTo((node.currentFuel + allocatedFuel) / node.burnRatePerHour);

      return {
        name: node.name,
        status: node.status,
        hoursRemaining: node.hoursRemaining,
        projectedHoursAfterDispatch,
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
      if (node.projectedShortfall > 0) {
        accumulator.capacityLimited += 1;
      }
      if (node.projectedStabilityShortfall > 0) {
        accumulator.stabilityCapacityLimited += 1;
      }
      return accumulator;
    },
    {
      critical: 0,
      warning: 0,
      stable: 0,
      capacityLimited: 0,
      stabilityCapacityLimited: 0,
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

  return {
    stabilityHours: CRITICAL_STABILITY_HOURS,
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
