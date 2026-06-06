import {
  CRITICAL_STABILITY_HOURS,
  DEFAULT_DELIVERY_DELAY_HOURS,
  DEFAULT_RESERVE_HOURS,
  formatHours,
  parseNodeRows,
  planFuel,
} from './calc-core.js';

const sampleRows = [
  'name\tcurrentFuel\tmaxFuel\tburnPerHour\tdeliveryDelayHours\tpriority',
  '# Pasted logistics snapshot',
  'North Gate\t90\t400\t10\t2\t2',
  'South Relay\t160\t240\t5\t4\t0',
  'Refinery Spine\t110\t500\t8\t\t4',
  'Dormant Backup\t50\t100\t0\t0\t0',
].join('\n');

const form = document.querySelector('[data-fuel-form]');
const textarea = document.querySelector('[data-node-input]');
const stabilityInput = document.querySelector('[data-stability-hours]');
const reserveInput = document.querySelector('[data-reserve-hours]');
const deliveryDelayInput = document.querySelector('[data-delivery-delay-hours]');
const availableFuelInput = document.querySelector('[data-available-fuel]');
const tripCapacityInput = document.querySelector('[data-trip-capacity]');
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

function describeDelayContext(plan) {
  return plan.counts.customDeliveryDelay > 0
    ? 'current delivery timings'
    : `current ${formatHourLabel(plan.deliveryDelayHours)} delay`;
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
    ['Critical Floor', formatHourLabel(plan.stabilityHours)],
    ['Reserve Target', formatHourLabel(plan.reserveHours)],
    ['Fuel On Hand', formatFuelBudget(plan.availableFuel)],
    ['Trip Manifests', getTripSummaryLabel(plan)],
    ['Fuel Burned Before Arrival', formatNumber(plan.totals.fuelConsumedBeforeArrival)],
    ['Fuel To Stabilize', formatNumber(plan.totals.fuelToStability)],
    ['Fuel To Reserve', formatNumber(plan.totals.fuelToReserve)],
    ['Arrival Outage Risk', plan.counts.arrivalRisk],
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

function createDispatchMarkup(plan) {
  const floorLabel = formatHourLabel(plan.stabilityHours);

  return plan.dispatch.order.map((node) => {
    const allocationParts = [
      `Send ${formatNumber(node.allocatedFuel)}`,
      node.allocatedForStability > 0 ? `${formatNumber(node.allocatedForStability)} to ${floorLabel} floor` : null,
      node.allocatedForReserve > 0 ? `${formatNumber(node.allocatedForReserve)} to reserve` : null,
    ].filter(Boolean);
    const delayLabel = node.usesCustomDeliveryDelay
      ? `${formatHourLabel(node.deliveryDelayHours)} node delay`
      : `${formatHourLabel(node.deliveryDelayHours)} default delay`;
    const priorityLabel = node.usesCustomPriority
      ? `${formatPriority(node.priority)} override`
      : `${formatPriority(node.priority)} queue`;

    return `
      <li class="dispatch-item tone-${node.status}">
        <div>
          <strong>${escapeHtml(node.name)}</strong>
          <span>${escapeHtml(node.status.toUpperCase())} | ${escapeHtml(priorityLabel)} | ${escapeHtml(delayLabel)} | ${escapeHtml(formatHours(node.hoursRemaining))} now | ${escapeHtml(formatHours(node.hoursAtArrival))} at arrival | ${escapeHtml(formatHours(node.projectedHoursAfterDispatch))} after dispatch</span>
        </div>
        <div class="dispatch-metrics">
          <span>${escapeHtml(allocationParts.join(' | '))}</span>
          <span>${node.runsDryBeforeArrival ? 'Runs dry before arrival' : `Burns ${escapeHtml(formatNumber(node.fuelConsumedBeforeArrival))} before arrival`}</span>
          <span>${node.remainingStabilityGap > 0 ? `${escapeHtml(floorLabel)} gap ${escapeHtml(formatNumber(node.remainingStabilityGap))}` : `${escapeHtml(floorLabel)} floor covered`}</span>
          <span>${node.remainingReserveGap > 0 ? `Reserve gap ${escapeHtml(formatNumber(node.remainingReserveGap))}` : 'Reserve covered'}</span>
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
      const stopParts = [
        `${formatNumber(stop.fuel)} fuel`,
        stop.forStability > 0 ? `${formatNumber(stop.forStability)} floor` : null,
        stop.forReserve > 0 ? `${formatNumber(stop.forReserve)} reserve` : null,
      ].filter(Boolean);

      return `
        <li>
          <strong>${escapeHtml(stop.name)}</strong>
          <span>${escapeHtml(stop.status.toUpperCase())}</span>
          <small>${escapeHtml(stopParts.join(' | '))}</small>
        </li>
      `;
    }).join('');

    return `
      <li class="trip-item">
        <div class="trip-header">
          <strong>Trip ${trip.tripNumber}</strong>
          <span>${escapeHtml(formatNumber(trip.fuel))} / ${escapeHtml(formatNumber(trip.capacity))} fuel loaded</span>
        </div>
        <p>${trip.remainingCapacity > 0 ? `${escapeHtml(formatNumber(trip.remainingCapacity))} capacity remains open on this run.` : 'Hull is fully committed for this run.'}</p>
        <ol class="trip-stops">${stopMarkup}</ol>
      </li>
    `;
  }).join('');
}

function createTableMarkup(plan) {
  return plan.perNode.map((node) => {
    const dispatch = getDispatchRecord(plan, node.name);
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
        <td>${escapeHtml(formatHours(node.hoursRemaining))}</td>
        <td>${escapeHtml(formatHours(node.hoursAtArrival))}</td>
        <td>${escapeHtml(formatNumber(node.fuelToStability))}</td>
        <td>${escapeHtml(formatNumber(dispatch?.remainingStabilityGap ?? 0))}</td>
        <td>${escapeHtml(formatNumber(node.fuelToReserve))}</td>
        <td>${escapeHtml(formatNumber(node.projectedShortfall))}</td>
        <td>${escapeHtml(formatNumber(dispatch?.allocatedFuel ?? 0))}</td>
        <td>${escapeHtml(formatNumber(dispatch?.remainingReserveGap ?? 0))}</td>
        <td>${escapeHtml(formatHours(dispatch?.projectedHoursAfterDispatch ?? node.hoursRemaining))}</td>
      </tr>
    `;
  }).join('');
}

function createReport(plan) {
  const floorLabel = formatHourLabel(plan.stabilityHours);
  const header = [
    `Delivery timing: ${getDelayCoverageLabel(plan)}`,
    `Priority overrides: ${getPriorityCoverageLabel(plan)}`,
    `Critical floor: ${floorLabel}`,
    `Reserve target: ${formatHourLabel(plan.reserveHours)}`,
    `Fuel on hand: ${plan.availableFuel === null ? 'Open' : formatNumber(plan.availableFuel)}`,
    `Trip capacity: ${formatTripCapacity(plan.dispatch.tripCapacity)}`,
    `Trip count: ${plan.dispatch.tripCount === null ? 'Not batched' : plan.dispatch.tripCount}`,
    `Fuel burned before arrival: ${formatNumber(plan.totals.fuelConsumedBeforeArrival)}`,
    `Fuel needed to stabilize critical nodes: ${formatNumber(plan.totals.fuelToStability)}`,
    `Fuel needed to reserve: ${formatNumber(plan.totals.fuelToReserve)}`,
    `Uncovered critical gap: ${formatNumber(plan.dispatch.uncoveredStability)}`,
    `Uncovered reserve gap: ${formatNumber(plan.dispatch.uncoveredReserve)}`,
    `Arrival outage risk: ${plan.counts.arrivalRisk}`,
    `Critical: ${plan.counts.critical}, Warning: ${plan.counts.warning}, Stable: ${plan.counts.stable}, Capacity-limited: ${plan.counts.capacityLimited}`,
  ];

  const rows = plan.dispatch.order.map((node) => [
    node.name,
    node.status.toUpperCase(),
    `priority ${formatPriority(node.priority)}`,
    `delay ${formatHourLabel(node.deliveryDelayHours)}`,
    `remaining ${formatHours(node.hoursRemaining)}`,
    `arrival ${formatHours(node.hoursAtArrival)}`,
    `after ${formatHours(node.projectedHoursAfterDispatch)}`,
    `send ${formatNumber(node.allocatedFuel)}`,
    `${floorLabel} ${node.remainingStabilityGap > 0 ? `gap ${formatNumber(node.remainingStabilityGap)}` : 'covered'}`,
    node.runsDryBeforeArrival ? 'offline before arrival' : `burns ${formatNumber(node.fuelConsumedBeforeArrival)} before arrival`,
    node.capacityLimited ? `reserve cap gap ${formatNumber(node.projectedShortfall)}` : 'reserve cap ok',
    node.remainingReserveGap > 0 ? `reserve gap ${formatNumber(node.remainingReserveGap)}` : 'reserve covered',
  ].join(' | '));

  const tripRows = plan.dispatch.tripCapacity === null
    ? ['Trip manifests: set a trip capacity to generate them.']
    : plan.dispatch.trips.map((trip) => {
      const stops = trip.stops
        .map((stop) => {
          const parts = [
            `${stop.name} ${formatNumber(stop.fuel)}`,
            stop.forStability > 0 ? `${formatNumber(stop.forStability)} floor` : null,
            stop.forReserve > 0 ? `${formatNumber(stop.forReserve)} reserve` : null,
          ].filter(Boolean);
          return parts.join(' / ');
        })
        .join(' ; ');
      return `Trip ${trip.tripNumber} | load ${formatNumber(trip.fuel)} / ${formatNumber(trip.capacity)} | remaining ${formatNumber(trip.remainingCapacity)} | ${stops}`;
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

  if (plan.counts.arrivalRisk > 0) {
    setFeedback(`${plan.counts.arrivalRisk} node(s) run dry before fuel arrives with the ${describeDelayContext(plan)}. Dispatch can recover them after arrival but cannot prevent that outage.`, 'critical');
  } else if (plan.dispatch.uncoveredStability > 0) {
    const reason = plan.counts.stabilityCapacityLimited > 0
      ? `${plan.counts.stabilityCapacityLimited} node(s) cannot physically hold ${formatHourLabel(plan.stabilityHours)} of fuel.`
      : 'Available dispatch fuel is below the immediate stabilization requirement at arrival.';
    setFeedback(`Critical coverage is short ${formatNumber(plan.dispatch.uncoveredStability)} fuel against the ${formatHourLabel(plan.stabilityHours)} floor. ${reason}`, 'critical');
  } else if (plan.dispatch.uncoveredReserve > 0) {
    const reason = plan.counts.capacityLimited > 0
      ? `${plan.counts.capacityLimited} node(s) cannot physically hold the full reserve target.`
      : 'Available dispatch fuel is below the reserve requirement at arrival.';
    setFeedback(`Critical nodes are stabilized, but dispatch is still short ${formatNumber(plan.dispatch.uncoveredReserve)} fuel for the full reserve target. ${reason}`, 'warning');
  } else if (plan.counts.critical > 0) {
    setFeedback(`${plan.counts.critical} node(s) will be critical by arrival but can be stabilized with this dispatch order.`, 'warning');
  } else if (plan.counts.warning > 0) {
    setFeedback(`${plan.counts.warning} node(s) fall below the reserve window by arrival.`, 'warning');
  } else {
    setFeedback('All tracked nodes meet the reserve window after delivery timing is applied.', 'stable');
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
    const plan = planFuel(nodes, reserveHours, availableFuel, stabilityHours, deliveryDelayHours, tripCapacity);
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
updatePlan();
