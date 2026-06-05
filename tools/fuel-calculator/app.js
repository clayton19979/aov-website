import { DEFAULT_RESERVE_HOURS, formatHours, parseNodeRows, planFuel } from './calc-core.js';

const sampleRows = [
  'North Gate,90,400,10',
  'South Relay,160,240,5',
  'Refinery Spine,310,500,8',
  'Dormant Backup,50,100,0',
].join('\n');

const form = document.querySelector('[data-fuel-form]');
const textarea = document.querySelector('[data-node-input]');
const reserveInput = document.querySelector('[data-reserve-hours]');
const summary = document.querySelector('[data-summary]');
const tableBody = document.querySelector('[data-table-body]');
const feedback = document.querySelector('[data-feedback]');
const fillSampleButton = document.querySelector('[data-fill-sample]');
const copyReportButton = document.querySelector('[data-copy-report]');

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
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
    ['Reserve Target', `${plan.reserveHours}h`],
    ['Fuel To Reserve', formatNumber(plan.totals.fuelToReserve)],
    ['Fuel To Full', formatNumber(plan.totals.fuelToFull)],
    ['Critical Nodes', plan.counts.critical],
    ['Warning Nodes', plan.counts.warning],
  ];

  return cards.map(([label, value]) => `
    <article class="summary-card">
      <span>${escapeHtml(String(label))}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </article>
  `).join('');
}

function createTableMarkup(plan) {
  return plan.perNode.map((node) => `
    <tr class="tone-${node.status}">
      <td>
        <strong>${escapeHtml(node.name)}</strong>
        <span>${escapeHtml(node.status.toUpperCase())}</span>
      </td>
      <td>${escapeHtml(formatNumber(node.currentFuel))}</td>
      <td>${escapeHtml(formatNumber(node.maxFuel))}</td>
      <td>${escapeHtml(formatNumber(node.burnRatePerHour))}</td>
      <td>${escapeHtml(formatHours(node.hoursRemaining))}</td>
      <td>${escapeHtml(formatNumber(node.fuelToReserve))}</td>
      <td>${escapeHtml(formatNumber(node.fuelToFull))}</td>
    </tr>
  `).join('');
}

function createReport(plan) {
  const header = [
    `Reserve target: ${plan.reserveHours}h`,
    `Fuel needed to reserve: ${formatNumber(plan.totals.fuelToReserve)}`,
    `Fuel needed to full: ${formatNumber(plan.totals.fuelToFull)}`,
    `Critical: ${plan.counts.critical}, Warning: ${plan.counts.warning}, Stable: ${plan.counts.stable}`,
  ];

  const rows = plan.perNode.map((node) => [
    node.name,
    node.status.toUpperCase(),
    `remaining ${formatHours(node.hoursRemaining)}`,
    `reserve +${formatNumber(node.fuelToReserve)}`,
    `full +${formatNumber(node.fuelToFull)}`,
  ].join(' | '));

  return [...header, '', ...rows].join('\n');
}

function setFeedback(message, tone = 'info') {
  feedback.textContent = message;
  feedback.dataset.tone = tone;
}

function renderPlan(plan) {
  summary.innerHTML = createSummaryMarkup(plan);
  tableBody.innerHTML = createTableMarkup(plan);
  copyReportButton.disabled = false;
  copyReportButton.dataset.report = createReport(plan);

  if (plan.counts.critical > 0) {
    setFeedback(`${plan.counts.critical} node(s) will burn dry inside 12 hours.`, 'critical');
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
    const plan = planFuel(nodes, reserveHours);
    renderPlan(plan);
  } catch (error) {
    summary.innerHTML = '';
    tableBody.innerHTML = '';
    copyReportButton.disabled = true;
    copyReportButton.dataset.report = '';
    setFeedback(error instanceof Error ? error.message : 'Could not calculate fuel plan.', 'critical');
  }
}

fillSampleButton.addEventListener('click', () => {
  textarea.value = sampleRows;
  reserveInput.value = String(DEFAULT_RESERVE_HOURS);
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
updatePlan();
