import {
  buildDispatchTextReport,
  buildNodeTableTsv,
  buildTripManifestTsv,
} from './report-export.js';

export function slugifyFileSegment(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'fuel-plan';
}

export function formatExportTimestamp(generatedAt = new Date()) {
  const date = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  if (Number.isNaN(date.valueOf())) {
    return 'unknown-time';
  }

  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ];

  return `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}${parts[4]}`;
}

export function buildExportBaseName(formState = {}, generatedAt = new Date()) {
  const timestamp = formatExportTimestamp(generatedAt);
  const firstNamedLine = String(formState.nodes ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '' && !line.startsWith('#'));
  const label = firstNamedLine ? slugifyFileSegment(firstNamedLine.split(/[\t,]/)[0]) : 'fuel-plan';
  return `aov-${label}-${timestamp}`;
}

export function buildExportFiles(plan, formState = {}, options = {}) {
  const baseName = buildExportBaseName(formState, options.generatedAt);
  const files = [
    {
      name: `${baseName}-dispatch-report.txt`,
      type: 'text/plain;charset=utf-8',
      content: buildDispatchTextReport(plan),
    },
    {
      name: `${baseName}-node-status.tsv`,
      type: 'text/tab-separated-values;charset=utf-8',
      content: buildNodeTableTsv(plan),
    },
  ];

  if (plan.dispatch.trips.length > 0) {
    files.push({
      name: `${baseName}-trip-manifests.tsv`,
      type: 'text/tab-separated-values;charset=utf-8',
      content: buildTripManifestTsv(plan),
    });
  }

  if (typeof options.shareUrl === 'string' && options.shareUrl.trim() !== '') {
    files.push({
      name: `${baseName}-share-link.url`,
      type: 'application/internet-shortcut',
      content: `[InternetShortcut]\r\nURL=${options.shareUrl.trim()}\r\n`,
    });
  }

  return files;
}

export function downloadExportFiles(files, dependencies = {}) {
  const documentRef = dependencies.documentRef ?? document;
  const urlRef = dependencies.urlRef ?? URL;
  let downloaded = 0;

  files.forEach((file) => {
    if (!file?.name || typeof file.content !== 'string') {
      return;
    }

    const blob = new Blob([file.content], { type: file.type || 'text/plain;charset=utf-8' });
    const href = urlRef.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = href;
    link.download = file.name;
    link.rel = 'noopener';
    link.style.display = 'none';
    documentRef.body.append(link);
    link.click();
    link.remove();
    urlRef.revokeObjectURL(href);
    downloaded += 1;
  });

  return downloaded;
}
