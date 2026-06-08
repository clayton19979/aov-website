import test from 'node:test';
import assert from 'node:assert/strict';

import { planFuel } from './calc-core.js';
import {
  buildExportBaseName,
  buildExportFiles,
  formatExportTimestamp,
  slugifyFileSegment,
} from './download-pack.js';

test('buildExportBaseName uses first node name and local timestamp', () => {
  assert.equal(slugifyFileSegment(' North Gate / Alpha '), 'north-gate-alpha');
  assert.equal(formatExportTimestamp(new Date(2026, 5, 7, 20, 15)), '2026-06-07-2015');
  assert.equal(
    buildExportBaseName({ nodes: '# comment\nNorth Gate,90,400,10' }, new Date(2026, 5, 7, 20, 15)),
    'aov-north-gate-2026-06-07-2015',
  );
});

test('buildExportFiles includes report, node TSV, trip TSV, and share shortcut when available', () => {
  const plan = planFuel([
    { name: 'North Gate', currentFuel: 90, maxFuel: 400, burnRatePerHour: 10 },
    { name: 'South Relay', currentFuel: 60, maxFuel: 240, burnRatePerHour: 5 },
  ], 24, 210, 12, 0, 90, 2, 1);

  const files = buildExportFiles(plan, { nodes: 'North Gate,90,400,10' }, {
    generatedAt: new Date(2026, 5, 7, 20, 15),
    shareUrl: 'https://aov.example/tools/fuel?nodes=sample',
  });

  assert.deepEqual(files.map((file) => file.name), [
    'aov-north-gate-2026-06-07-2015-dispatch-report.txt',
    'aov-north-gate-2026-06-07-2015-node-status.tsv',
    'aov-north-gate-2026-06-07-2015-trip-manifests.tsv',
    'aov-north-gate-2026-06-07-2015-share-link.url',
  ]);
  assert.match(files[0].content, /Dispatch order:/);
  assert.match(files[1].content, /^Node\tStatus/m);
  assert.match(files[2].content, /^TripNumber\tDepartureOffsetHours/m);
  assert.match(files[3].content, /^\[InternetShortcut\]\r\nURL=https:\/\/aov\.example/m);
});

test('buildExportFiles omits trip and share files when unavailable', () => {
  const plan = planFuel([
    { name: 'Dormant Backup', currentFuel: 50, maxFuel: 100, burnRatePerHour: 0 },
  ], 24, Infinity, 12, 0, null, null, null);

  const files = buildExportFiles(plan, { nodes: 'Dormant Backup,50,100,0' }, {
    generatedAt: new Date(2026, 5, 7, 20, 15),
  });

  assert.deepEqual(files.map((file) => file.name), [
    'aov-dormant-backup-2026-06-07-2015-dispatch-report.txt',
    'aov-dormant-backup-2026-06-07-2015-node-status.tsv',
  ]);
});

