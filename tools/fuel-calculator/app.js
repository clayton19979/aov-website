import {
  CRITICAL_STABILITY_HOURS,
  DEFAULT_DELIVERY_DELAY_HOURS,
  DEFAULT_RESERVE_HOURS,
  DEFAULT_TRIP_TURNAROUND_HOURS,
  formatHours,
  parseNodeRows,
  planFuel,
} from './calc-core.js';

const sampleRows = [
  'name\tcurrentFuel\tmaxFuel\tburnPerHour\tdeliveryDelayHours\tpriority\tstabilityHours\treserveHours',
  '# Pasted logistics snapshot',
  'North Gate\t90\t400\t10\t2\t2\t12\t30',
  'South Relay\t160\t240\t5\t4\t0\t\t18',
  'Refinery Spine\t110\t500\t8\t\t4\t16\t36',
  'Dormant Backup\t50\t100\t0\t0\t0\t0\t0',
].join('\n');

const form = document.querySelector('[data-fuel-form]');
const textarea = document.querySelector('[data-node-input]');
const stabilityInput = document.querySelector('[data-stability-hours]');
const reserveInput = document.querySelector('[data-reserve-hours]');
const deliveryDelayInput = document.querySelector('[data-delivery-delay-hours]');
const availableFuelInput = document.querySelector('[data-available-fuel]');
const tripCapacityInput = document.querySelector('[data-trip-capacity]');
const tripTurnaroundInput = document.querySelector('[data-trip-turnaround-hours]');
const summary = document.querySelector('[data-summary]');
const dispatchList = document.querySelector('[data-dispatch-list]');
const tripList = document.querySelector('[data-trip-list]');
const tableBody = document.querySelector('[data-table-body]');
const feedback = document.querySelector('[data-feedback]');
const fillSampleButton = document.querySelector('[data-fill-sample]');
const copyReportButton = document.querySelector('[data-copy-report]');
const floorNeedHeader = document.querySelector('[data-floor-need-label]');
const floorGapHeader = document.querySelector('[data-floor-gap-label]');

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function formatFuelBudget(value) {
  return value === null ? 'Open' : formatNumber(value);
}

function formatHourLabel(value) {
  return `${formatNumber(value)}h`;
}

function formatOffsetLabel(value) {
  return `+${formatHourLabel(value)}`;
}

function formatTripCapacity(value) {
  return value === null ? 'Direct dispatch' : `${formatNumber(value)} / trip`;
}

function formatPriority(value) {
  return value > 0 ? `P${formatNumber(value)}` : 'Base';
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function syncFloorLabels(stabilityHours) {
  const floorLabel = formatHourLabel(stabilityHours);
  floorNeedHeader.textContent = `To ${floorLabel}`;
  floorGapHeader.textContent = `${floorLabel} Gap`;
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

function describeDelayContext(plan) {
  return plan.counts.customDeliveryDelay > 0
    ? 'current delivery timings'
    : `current ${formatHourLabel(plan.deliveryDelayHours)} delay`;
}

function describeStabilityContext(plan) {
  return plan.counts.customStabilityHours > 0
    ? 'node-specific stability floors'
    : `${formatHourLabel(plan.stabilityHours)} floor`;
}

function describeReserveContext(plan) {
  return plan.counts.customReserveHours > 0
    ? 'node-specific reserve targets'
    : `${formatHourLabel(plan.reserveHours)} reserve target`;
}

function getTripCadenceLabel(plan) {
  if (plan.dispatch.tripCapacity === null) {
    return 'Direct dispatch';
  }
  if ((plan.dispatch.tripTurnaroundHours ?? 0) === 0) {
    return 'Back-to-back departures';
  }
  return `${formatHourLabel(plan.dispatch.tripTurnaroundHours)} between trips`;
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

function getTripSummaryLabel(plan) {
  if (plan.dispatch.tripCapacity === null) {
    return 'Direct dispatch';
  }

  return `${plan.dispatch.tripCount} trip${plan.dispatch.tripCount === 1 ? '' : 's'} @ ${formatTripCapacity(plan.dispatch.tripCapacity)}`;
}

function createSummaryMarkup(plan) {
  const cards = [
    ['Tracked Nodes', plan.perNode.length],
    ['Delivery Timing', getDelayCoverageLabel(plan)],
    ['Priority Overrides', getPriorityCoverageLabel(plan)],
    ['Critical Floors', getStabilityCoverageLabel(plan)],
    ['Reserve Windows', getReserveCoverageLabel(plan)],
    ['Fuel On Hand', formatFuelBudget(plan.availableFuel)],
    ['Trip Manifests', getTripSummaryLabel(plan)],
    ['Trip Cadence', getTripCadenceLabel(plan)],
    ['Trip Timing Risk', getTripRiskLabel(plan)],
    ['Fuel Burned Before Arrival', formatNumber(plan.totals.fuelConsumedBeforeArrival)],
    ['Fuel To Stabilize', formatNumber(plan.totals.fuelToStability)],
    ['Fuel Remaining', formatFuelBudget(plan.dispatch.remainingFuel)],
  ];

  return cards.map(([label, value]) => `
    <article class="summary-card">
      <span>${escapeHtml(String(label))}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join('');
}

function getDispatchRecord(plan, nodeName) {
  return plan.dispatch.order.find((entry) => entry.name === nodeName);
}

function formatCoveragePair(node) {
  return `${formatHourLabel(node.stabilityHours)} floor | ${formatHourLabel(node.reserveHours)} reserve`;
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

function createDispatchMarkup(plan) {
  return plan.dispatch.order.map((node) => {
    const stabilityGap = getDisplayStabilityGap(plan, node);
    const reserveGap = getDisplayReserveGap(plan, node);
    const projectedHours = getDisplayProjectedHours(plan, node);
    const runsDryBeforeArrival = getDisplayRunsDry(plan, node);
    const allocationParts = [
      `Send ${formatNumber(node.allocatedFuel)}`,
      node.allocatedForStability > 0 ? `${formatNumber(node.allocatedForStability)} to ${formatHourLabel(node.stabilityHours)} floor` : null,
      node.allocatedForReserve > 0 ? `${formatNumber(node.allocatedForReserve)} to reserve` : null,
    ].filter(Boolean);
    const delayLabel = node.usesCustomDeliveryDelay
      ? `${formatHourLabel(node.deliveryDelayHours)} node delay`
      : `${formatHourLabel(node.deliveryDelayHours)} default delay`;
    const priorityLabel = node.usesCustomPriority
      ? `${formatPriority(node.priority)} override`
      : `${formatPriority(node.priority)} queue`;
    const coverageLabel = (node.usesCustomStabilityHours || node.usesCustomReserveHours)
      ? `${formatCoveragePair(node)} override`
      : `${formatCoveragePair(node)} default`;
    const cadenceLabel = plan.dispatch.tripCapacity !== null && node.allocatedFuel > 0
      ? (node.usesTripCadence
        ? `last drop ${formatOffsetLabel(node.scheduledArrivalOffsetHours)}`
        : `drop ${formatOffsetLabel(node.scheduledArrivalOffsetHours)}`)
      : 'not scheduled';

    return `
      <li class="dispatch-item tone-${node.status}">
        <div>
          <strong>${escapeHtml(node.name)}</strong>
          <span>${escapeHtml(node.status.toUpperCase())} | ${escapeHtml(priorityLabel)} | ${escapeHtml(delayLabel)} | ${escapeHtml(coverageLabel)} | ${escapeHtml(formatHours(node.hoursRemaining))} now | ${escapeHtml(formatHours(node.hoursAtArrival))} at arrival | ${escapeHtml(formatHours(projectedHours))} after dispatch</span>
        </div>
        <div class="dispatch-metrics">
          <span>${escapeHtml(allocationParts.join(' | '))}</span>
          <span>${plan.dispatch.tripCapacity !== null ? escapeHtml(cadenceLabel) : (runsDryBeforeArrival ? 'Runs dry before arrival' : `Burns ${escapeHtml(formatNumber(node.fuelConsumedBeforeArrival))} before arrival`)}</span>
          <span>${runsDryBeforeArrival ? 'Runs dry before scheduled drop' : `Burns ${escapeHtml(formatNumber(node.fuelConsumedBeforeArrival))} before first arrival`}</span>
          <span>${stabilityGap > 0 ? `${escapeHtml(formatHourLabel(node.stabilityHours))} gap ${escapeHtml(formatNumber(stabilityGap))}` : `${escapeHtml(formatHourLabel(node.stabilityHours))} floor covered`}</span>
          <span>${reserveGap > 0 ? `Reserve gap ${escapeHtml(formatNumber(reserveGap))}` : 'Reserve covered'}</span>
          ${node.capacityLimited ? `<span>Max capacity leaves ${escapeHtml(formatNumber(node.projectedShortfall))} reserve uncovered</span>` : ''}
        </div>
      </li>
    `;
  }).join('');
}

function createTripMarkup(plan) {
  if (plan.dispatch.tripCapacity === null) {
    return '<li class="trip-item trip-empty">Set a trip capacity to break this dispatch order into hauler-sized manifests.</li>';
  }

  return plan.dispatch.trips.map((trip) => {
    const stopMarkup = trip.stops.map((stop) => {
      const stopNode = getDispatchRecord(plan, stop.name);
      const stopParts = [
        `${formatNumber(stop.fuel)} fuel`,
        stop.forStability > 0 ? `${formatNumber(stop.forStability)} floor` : null,
        stop.forReserve > 0 ? `${formatNumber(stop.forReserve)} reserve` : null,
      ].filter(Boolean);
      const outcomeParts = [
        `arrives ${formatOffsetLabel(stop.arrivalOffsetHours)}`,
        `before ${formatNumber(stop.fuelBeforeArrival)}`,
        `after ${formatNumber(stop.fuelAfterDelivery)}`,
        `runtime ${formatHours(stop.projectedHoursAfterDelivery)}`,
      ];
      if (stop.remainingStabilityGap > 0) {
        outcomeParts.push(`${formatNumber(stop.remainingStabilityGap)} floor gap`);
      }
      if (stop.remainingReserveGap > 0) {
        outcomeParts.push(`${formatNumber(stop.remainingReserveGap)} reserve gap`);
      }
      if (stop.runsDryBeforeArrival) {
        outcomeParts.push('runs dry before arrival');
      }

      return `
        <li>
          <strong>${escapeHtml(stop.name)}</strong>
          <span>${escapeHtml(stop.status.toUpperCase())}${stopNode ? ` | ${escapeHtml(formatCoveragePair(stopNode))}` : ''}</span>
          <small>${escapeHtml(stopParts.join(' | '))}</small>
          <small>${escapeHtml(outcomeParts.join(' | '))}</small>
        </li>
      `;
    }).join('');

    return `
      <li class="trip-item">
        <div class="trip-header">
          <strong>Trip ${trip.tripNumber}</strong>
          <span>${escapeHtml(formatNumber(trip.fuel))} / ${escapeHtml(formatNumber(trip.capacity))} fuel loaded</span>
        </div>
        <p>Departs ${escapeHtml(formatOffsetLabel(trip.departureOffsetHours))}. ${trip.remainingCapacity > 0 ? `${escapeHtml(formatNumber(trip.remainingCapacity))} capacity remains open on this run.` : 'Hull is fully committed for this run.'}</p>
        <ol class="trip-stops">${stopMarkup}</ol>
      </li>
    `;
  }).join('');
}

function createTableMarkup(plan) {
  return plan.perNode.map((node) => {
    const dispatch = getDispatchRecord(plan, node.name);
    const stabilityGap = dispatch ? getDisplayStabilityGap(plan, dispatch) : 0;
    const reserveGap = dispatch ? getDisplayReserveGap(plan, dispatch) : 0;
    const projectedHours = dispatch ? getDisplayProjectedHours(plan, dispatch) : node.hoursRemaining;
    const lastDrop = dispatch && dispatch.allocatedFuel > 0 && plan.dispatch.tripCapacity !== null
      ? formatOffsetLabel(dispatch.scheduledArrivalOffsetHours)
      : '—';

    return `
      <tr class="tone-${node.status}">
        <td>
          <strong>${escapeHtml(node.name)}</strong>
          <span>${escapeHtml(node.status.toUpperCase())}</span>
        </td>
        <td>${escapeHtml(formatNumber(node.currentFuel))}</td>
        <td>${escapeHtml(formatNumber(node.maxFuel))}</td>
        <td>${escapeHtml(formatNumber(node.burnRatePerHour))}</td>
        <td>${escapeHtml(formatPriority(node.priority))}</td>
        <td>${escapeHtml(formatHourLabel(node.deliveryDelayHours))}</td>
        <td>${escapeHtml(formatHourLabel(node.stabilityHours))} / ${escapeHtml(formatHourLabel(node.reserveHours))}</td>
        <td>${escapeHtml(formatHours(node.hoursRemaining))}</td>
        <td>${escapeHtml(formatHours(node.hoursAtArrival))}</td>
        <td>${escapeHtml(lastDrop)}</td>
        <td>${escapeHtml(formatNumber(node.fuelToStability))}</td>
        <td>${escapeHtml(formatNumber(stabilityGap))}</td>
        <td>${escapeHtml(formatNumber(node.fuelToReserve))}</td>
        <td>${escapeHtml(formatNumber(node.projectedShortfall))}</td>
        <td>${escapeHtml(formatNumber(dispatch?.allocatedFuel ?? 0))}</td>
        <td>${escapeHtml(formatNumber(reserveGap))}</td>
        <td>${escapeHtml(formatHours(projectedHours))}</td>
      </tr>
    `;
  }).join('');
}

function createReport(plan) {
  const header = [
    `Delivery timing: ${getDelayCoverageLabel(plan)}`,
    `Priority overrides: ${getPriorityCoverageLabel(plan)}`,
    `Critical floors: ${getStabilityCoverageLabel(plan)}`,
    `Reserve windows: ${getReserveCoverageLabel(plan)}`,
    `Fuel on hand: ${plan.availableFuel === null ? 'Open' : formatNumber(plan.availableFuel)}`,
    `Trip capacity: ${formatTripCapacity(plan.dispatch.tripCapacity)}`,
    `Trip turnaround: ${plan.dispatch.tripTurnaroundHours === null ? 'Not batched' : formatHourLabel(plan.dispatch.tripTurnaroundHours)}`,
    `Trip count: ${plan.dispatch.tripCount === null ? 'Not batched' : plan.dispatch.tripCount}`,
    `Trip timing risk: ${getTripRiskLabel(plan)}`,
    `Fuel burned before arrival: ${formatNumber(plan.totals.fuelConsumedBeforeArrival)}`,
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
    `remaining ${formatHours(node.hoursRemaining)}`,
    `arrival ${formatHours(node.hoursAtArrival)}`,
    `last drop ${node.allocatedFuel > 0 && plan.dispatch.tripCapacity !== null ? formatOffsetLabel(node.scheduledArrivalOffsetHours) : 'n/a'}`,
    `after ${formatHours(getDisplayProjectedHours(plan, node))}`,
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
          const stopNode = getDispatchRecord(plan, stop.name);
          const parts = [
            `${stop.name} ${formatNumber(stop.fuel)}`,
            stopNode ? `${formatHourLabel(stopNode.stabilityHours)} floor / ${formatHourLabel(stopNode.reserveHours)} reserve` : null,
            `arrives ${formatOffsetLabel(stop.arrivalOffsetHours)}`,
            `before ${formatNumber(stop.fuelBeforeArrival)}`,
            `after ${formatNumber(stop.fuelAfterDelivery)}`,
            `runtime ${formatHours(stop.projectedHoursAfterDelivery)}`,
            stop.forStability > 0 ? `${formatNumber(stop.forStability)} floor` : null,
            stop.forReserve > 0 ? `${formatNumber(stop.forReserve)} reserve` : null,
            stop.remainingReserveGap > 0 ? `${formatNumber(stop.remainingReserveGap)} reserve gap` : 'reserve covered',
            stop.runsDryBeforeArrival ? 'offline before arrival' : null,
          ].filter(Boolean);
          return parts.join(' / ');
        })
        .join(' ; ');
      return `Trip ${trip.tripNumber} | depart ${formatOffsetLabel(trip.departureOffsetHours)} | load ${formatNumber(trip.fuel)} / ${formatNumber(trip.capacity)} | remaining ${formatNumber(trip.remainingCapacity)} | ${stops}`;
    });

  return [...header, '', 'Dispatch order:', ...rows, '', 'Trip manifests:', ...tripRows].join('\n');
}

function setFeedback(message, tone = 'info') {
  feedback.textContent = message;
  feedback.dataset.tone = tone;
}

function renderPlan(plan) {
  syncFloorLabels(plan.stabilityHours);
  summary.innerHTML = createSummaryMarkup(plan);
  dispatchList.innerHTML = createDispatchMarkup(plan);
  tripList.innerHTML = createTripMarkup(plan);
  tableBody.innerHTML = createTableMarkup(plan);
  copyReportButton.disabled = false;
  copyReportButton.dataset.report = createReport(plan);

  if (plan.dispatch.tripCapacity !== null && plan.dispatch.tripTiming.additionalArrivalRisk > 0) {
    setFeedback(`${plan.dispatch.tripTiming.additionalArrivalRisk} node(s) stay online in the base plan but run dry once later trip departures are applied. Reduce trip turnaround or re-balance the manifests.`, 'critical');
  } else if (plan.dispatch.tripCapacity !== null && plan.dispatch.tripTiming.degradedStability > 0) {
    setFeedback(`${plan.dispatch.tripTiming.degradedStability} node(s) lose critical-floor coverage once convoy timing is applied. Increase trip capacity, reduce turnaround, or move those drops earlier.`, 'critical');
  } else if (plan.dispatch.tripCapacity !== null && plan.dispatch.tripTiming.degradedReserve > 0) {
    setFeedback(`${plan.dispatch.tripTiming.degradedReserve} node(s) lose reserve coverage once convoy timing is applied. The base allocation is valid, but later manifests land too late to preserve the full reserve window.`, 'warning');
  } else if (plan.counts.arrivalRisk > 0) {
    setFeedback(`${plan.counts.arrivalRisk} node(s) run dry before fuel arrives with the ${describeDelayContext(plan)}. Dispatch can recover them after arrival but cannot prevent that outage.`, 'critical');
  } else if (plan.dispatch.uncoveredStability > 0) {
    const reason = plan.counts.stabilityCapacityLimited > 0
      ? `${plan.counts.stabilityCapacityLimited} node(s) cannot physically hold enough fuel for the ${describeStabilityContext(plan)}.`
      : `Available dispatch fuel is below the immediate ${describeStabilityContext(plan)} requirement at arrival.`;
    setFeedback(`Critical coverage is short ${formatNumber(plan.dispatch.uncoveredStability)} fuel against the ${describeStabilityContext(plan)}. ${reason}`, 'critical');
  } else if (plan.dispatch.uncoveredReserve > 0) {
    const reason = plan.counts.capacityLimited > 0
      ? `${plan.counts.capacityLimited} node(s) cannot physically hold the full ${describeReserveContext(plan)}.`
      : `Available dispatch fuel is below the ${describeReserveContext(plan)} requirement at arrival.`;
    setFeedback(`Critical nodes are stabilized, but dispatch is still short ${formatNumber(plan.dispatch.uncoveredReserve)} fuel for the ${describeReserveContext(plan)}. ${reason}`, 'warning');
  } else if (plan.counts.critical > 0) {
    setFeedback(`${plan.counts.critical} node(s) will be critical by arrival but can be stabilized with this dispatch order.`, 'warning');
  } else if (plan.counts.warning > 0) {
    setFeedback(`${plan.counts.warning} node(s) fall below their reserve window by arrival.`, 'warning');
  } else {
    setFeedback('All tracked nodes meet their reserve window after delivery timing is applied.', 'stable');
  }
}

function updatePlan() {
  try {
    const nodes = parseNodeRows(textarea.value);
    const stabilityHours = Number(stabilityInput.value || CRITICAL_STABILITY_HOURS);
    const reserveHours = Number(reserveInput.value || DEFAULT_RESERVE_HOURS);
    const deliveryDelayHours = Number(deliveryDelayInput.value || DEFAULT_DELIVERY_DELAY_HOURS);
    const availableFuel = availableFuelInput.value.trim() === ''
      ? Infinity
      : Number(availableFuelInput.value);
    const tripCapacity = tripCapacityInput.value.trim() === ''
      ? null
      : Number(tripCapacityInput.value);
    const tripTurnaroundHours = tripTurnaroundInput.value.trim() === ''
      ? DEFAULT_TRIP_TURNAROUND_HOURS
      : Number(tripTurnaroundInput.value);
    const plan = planFuel(
      nodes,
      reserveHours,
      availableFuel,
      stabilityHours,
      deliveryDelayHours,
      tripCapacity,
      tripTurnaroundHours,
    );
    renderPlan(plan);
  } catch (error) {
    summary.innerHTML = '';
    dispatchList.innerHTML = '';
    tripList.innerHTML = '';
    tableBody.innerHTML = '';
    copyReportButton.disabled = true;
    copyReportButton.dataset.report = '';
    setFeedback(error instanceof Error ? error.message : 'Could not calculate fuel plan.', 'critical');
  }
}

fillSampleButton.addEventListener('click', () => {
  textarea.value = sampleRows;
  stabilityInput.value = String(CRITICAL_STABILITY_HOURS);
  reserveInput.value = String(DEFAULT_RESERVE_HOURS);
  deliveryDelayInput.value = '3';
  availableFuelInput.value = '220';
  tripCapacityInput.value = '90';
  tripTurnaroundInput.value = '2';
  updatePlan();
});

copyReportButton.addEventListener('click', async () => {
  const report = copyReportButton.dataset.report || '';
  if (!report) {
    return;
  }

  try {
    await navigator.clipboard.writeText(report);
    setFeedback('Copied fuel dispatch report to clipboard.', 'stable');
  } catch {
    setFeedback('Clipboard write failed. Copy the table manually.', 'warning');
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  updatePlan();
});

textarea.value = sampleRows;
stabilityInput.value = String(CRITICAL_STABILITY_HOURS);
reserveInput.value = String(DEFAULT_RESERVE_HOURS);
deliveryDelayInput.value = '3';
availableFuelInput.value = '220';
tripCapacityInput.value = '90';
tripTurnaroundInput.value = '2';
updatePlan();
