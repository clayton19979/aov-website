import {
  CRITICAL_STABILITY_HOURS,
  DEFAULT_RESERVE_HOURS,
  formatHours,
  parseNodeRows,
  planFuel,
} from './calc-core.js';

const sampleRows = [
  'name\tcurrentFuel\tmaxFuel\tburnPerHour',
  '# Pasted logistics snapshot',
  'North Gate\t90\t400\t10',
  'South Relay\t160\t240\t5',
  'Refinery Spine\t110\t500\t8',
  'Dormant Backup\t50\t100\t0',
].join('\n');

const form = document.querySelector('[data-fuel-form]');
const textarea = document.querySelector('[data-node-input]');
const reserveInput = document.querySelector('[data-reserve-hours]');
const availableFuelInput = document.querySelector('[data-available-fuel]');
const summary = document.querySelector('[data-summary]');
const dispatchList = document.querySelector('[data-dispatch-list]');
const tableBody = document.querySelector('[data-table-body]');
const feedback = document.querySelector('[data-feedback]');
const fillSampleButton = document.querySelector('[data-fill-sample]');
const copyReportButton = document.querySelector('[data-copy-report]');

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function formatFuelBudget(value) {
  return value === null ? 'Open' : formatNumber(value);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createSummaryMarkup(plan) {
  const cards = [
    ['Tracked Nodes', plan.perNode.length],
    ['Critical Floor', `${plan.stabilityHours}h`],
    ['Reserve Target', `${plan.reserveHours}h`],
    ['Fuel On Hand', formatFuelBudget(plan.availableFuel)],
    ['Fuel To Stabilize', formatNumber(plan.totals.fuelToStability)],
    ['Fuel To Reserve', formatNumber(plan.totals.fuelToReserve)],
    ['Critical Gap', formatNumber(plan.dispatch.uncoveredStability)],
    ['Reserve Gap', formatNumber(plan.dispatch.uncoveredReserve)],
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
  return plan.dispatch.order.map((node) => {
    const allocationParts = [
      `Send ${formatNumber(node.allocatedFuel)}`,
      node.allocatedForStability > 0 ? `${formatNumber(node.allocatedForStability)} to ${CRITICAL_STABILITY_HOURS}h floor` : null,
      node.allocatedForReserve > 0 ? `${formatNumber(node.allocatedForReserve)} to reserve` : null,
    ].filter(Boolean);

    return `
      <li class="dispatch-item tone-${node.status}">
        <div>
          <strong>${escapeHtml(node.name)}</strong>
          <span>${escapeHtml(node.status.toUpperCase())} · ${escapeHtml(formatHours(node.hoursRemaining))} now · ${escapeHtml(formatHours(node.projectedHoursAfterDispatch))} after dispatch</span>
        </div>
        <div class="dispatch-metrics">
          <span>${escapeHtml(allocationParts.join(' | '))}</span>
          <span>${node.remainingStabilityGap > 0 ? `12h gap ${escapeHtml(formatNumber(node.remainingStabilityGap))}` : `${CRITICAL_STABILITY_HOURS}h floor covered`}</span>
          <span>${node.remainingReserveGap > 0 ? `Reserve gap ${escapeHtml(formatNumber(node.remainingReserveGap))}` : 'Reserve covered'}</span>
          ${node.capacityLimited ? `<span>Max capacity leaves ${escapeHtml(formatNumber(node.projectedShortfall))} reserve uncovered</span>` : ''}
        </div>
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
        <td>${escapeHtml(formatHours(node.hoursRemaining))}</td>
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
  const header = [
    `Critical floor: ${plan.stabilityHours}h`,
    `Reserve target: ${plan.reserveHours}h`,
    `Fuel on hand: ${plan.availableFuel === null ? 'Open' : formatNumber(plan.availableFuel)}`,
    `Fuel needed to stabilize critical nodes: ${formatNumber(plan.totals.fuelToStability)}`,
    `Fuel needed to reserve: ${formatNumber(plan.totals.fuelToReserve)}`,
    `Uncovered critical gap: ${formatNumber(plan.dispatch.uncoveredStability)}`,
    `Uncovered reserve gap: ${formatNumber(plan.dispatch.uncoveredReserve)}`,
    `Critical: ${plan.counts.critical}, Warning: ${plan.counts.warning}, Stable: ${plan.counts.stable}, Capacity-limited: ${plan.counts.capacityLimited}`,
  ];

  const rows = plan.dispatch.order.map((node) => [
    node.name,
    node.status.toUpperCase(),
    `remaining ${formatHours(node.hoursRemaining)}`,
    `after ${formatHours(node.projectedHoursAfterDispatch)}`,
    `send ${formatNumber(node.allocatedFuel)}`,
    `12h ${node.remainingStabilityGap > 0 ? `gap ${formatNumber(node.remainingStabilityGap)}` : 'covered'}`,
    node.capacityLimited ? `reserve cap gap ${formatNumber(node.projectedShortfall)}` : 'reserve cap ok',
    node.remainingReserveGap > 0 ? `reserve gap ${formatNumber(node.remainingReserveGap)}` : 'reserve covered',
  ].join(' | '));

  return [...header, '', ...rows].join('\n');
}

function setFeedback(message, tone = 'info') {
  feedback.textContent = message;
  feedback.dataset.tone = tone;
}

function renderPlan(plan) {
  summary.innerHTML = createSummaryMarkup(plan);
  dispatchList.innerHTML = createDispatchMarkup(plan);
  tableBody.innerHTML = createTableMarkup(plan);
  copyReportButton.disabled = false;
  copyReportButton.dataset.report = createReport(plan);

  if (plan.dispatch.uncoveredStability > 0) {
    const reason = plan.counts.stabilityCapacityLimited > 0
      ? `${plan.counts.stabilityCapacityLimited} node(s) cannot physically hold ${plan.stabilityHours} hours of fuel.`
      : 'Available dispatch fuel is below the immediate stabilization requirement.';
    setFeedback(`Critical coverage is short ${formatNumber(plan.dispatch.uncoveredStability)} fuel against the ${plan.stabilityHours}h floor. ${reason}`, 'critical');
  } else if (plan.dispatch.uncoveredReserve > 0) {
    const reason = plan.counts.capacityLimited > 0
      ? `${plan.counts.capacityLimited} node(s) cannot physically hold the full reserve target.`
      : 'Available dispatch fuel is below the reserve requirement.';
    setFeedback(`Critical nodes are stabilized, but dispatch is still short ${formatNumber(plan.dispatch.uncoveredReserve)} fuel for the full reserve target. ${reason}`, 'warning');
  } else if (plan.counts.critical > 0) {
    setFeedback(`${plan.counts.critical} node(s) are currently critical but can be stabilized with this dispatch order.`, 'warning');
  } else if (plan.counts.warning > 0) {
    setFeedback(`${plan.counts.warning} node(s) are below the reserve window.`, 'warning');
  } else {
    setFeedback('All tracked nodes meet the reserve window.', 'stable');
  }
}

function updatePlan() {
  try {
    const nodes = parseNodeRows(textarea.value);
    const reserveHours = Number(reserveInput.value || DEFAULT_RESERVE_HOURS);
    const availableFuel = availableFuelInput.value.trim() === ''
      ? Infinity
      : Number(availableFuelInput.value);
    const plan = planFuel(nodes, reserveHours, availableFuel);
    renderPlan(plan);
  } catch (error) {
    summary.innerHTML = '';
    dispatchList.innerHTML = '';
    tableBody.innerHTML = '';
    copyReportButton.disabled = true;
    copyReportButton.dataset.report = '';
    setFeedback(error instanceof Error ? error.message : 'Could not calculate fuel plan.', 'critical');
  }
}

fillSampleButton.addEventListener('click', () => {
  textarea.value = sampleRows;
  reserveInput.value = String(DEFAULT_RESERVE_HOURS);
  availableFuelInput.value = '220';
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
reserveInput.value = String(DEFAULT_RESERVE_HOURS);
availableFuelInput.value = '220';
updatePlan();
