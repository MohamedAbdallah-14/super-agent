import fs from 'node:fs';

export function estimateTokens(bytes) {
  if (bytes < 0) {
    process.stderr.write(`warning: estimateTokens called with negative bytes (${bytes}), returning 0\n`);
    return 0;
  }
  if (bytes === 0) return 0;
  return Math.ceil(bytes / 4);
}

function createDefaultUsage(runId) {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    run_id: runId,
    created_at: now,
    updated_at: now,
    phases: {},
    roles: {},
    savings: {
      capture_routing: {
        raw_bytes: 0,
        summary_bytes: 0,
        estimated_tokens_avoided: 0,
        strategy: 'byte_heuristic',
      },
      context_mode: {
        available: false,
        raw_kb: 0,
        context_kb: 0,
        savings_ratio: '0%',
        per_tool: {},
      },
      compaction: {
        compaction_count: 0,
        pre_compaction_tokens_est: 0,
        post_compaction_tokens_est: 0,
      },
    },
    totals: {
      total_events: 0,
      total_capture_bytes_raw: 0,
      total_capture_bytes_summary: 0,
      total_estimated_tokens_if_raw: 0,
      total_estimated_tokens_avoided: 0,
      savings_percentage: '0%',
    },
  };
}

function writeUsageAtomic(runPaths, usage) {
  usage.updated_at = new Date().toISOString();
  const tmpPath = `${runPaths.usagePath}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(usage, null, 2)}\n`);
  fs.renameSync(tmpPath, runPaths.usagePath);
}

function recalcTotals(usage) {
  let totalEvents = 0;
  let totalRaw = 0;
  let totalSummary = 0;

  for (const phase of Object.values(usage.phases)) {
    totalEvents += phase.events_count ?? 0;
    totalRaw += phase.capture_bytes_raw ?? 0;
    totalSummary += phase.capture_bytes_summary ?? 0;
  }

  usage.totals.total_events = totalEvents;
  usage.totals.total_capture_bytes_raw = totalRaw;
  usage.totals.total_capture_bytes_summary = totalSummary;
  usage.totals.total_estimated_tokens_if_raw = estimateTokens(totalRaw);
  usage.totals.total_estimated_tokens_avoided = estimateTokens(totalRaw - totalSummary);

  const ifRaw = usage.totals.total_estimated_tokens_if_raw;
  const avoided = usage.totals.total_estimated_tokens_avoided;
  usage.totals.savings_percentage = ifRaw > 0
    ? `${((avoided / ifRaw) * 100).toFixed(1)}%`
    : '0%';
}

export function readUsage(runPaths) {
  if (!fs.existsSync(runPaths.usagePath)) {
    return createDefaultUsage('unknown');
  }

  try {
    const raw = fs.readFileSync(runPaths.usagePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    process.stderr.write(`warning: malformed usage.json at ${runPaths.usagePath}, using defaults\n`);
    return createDefaultUsage('unknown');
  }
}

export function initUsage(runPaths, runId) {
  if (fs.existsSync(runPaths.usagePath)) {
    return readUsage(runPaths);
  }

  const usage = createDefaultUsage(runId);
  writeUsageAtomic(runPaths, usage);
  return usage;
}

export function recordCaptureSavings(runPaths, rawBytes, summaryBytes) {
  const usage = readUsage(runPaths);
  usage.savings.capture_routing.raw_bytes += rawBytes;
  usage.savings.capture_routing.summary_bytes += summaryBytes;
  usage.savings.capture_routing.estimated_tokens_avoided = estimateTokens(
    usage.savings.capture_routing.raw_bytes - usage.savings.capture_routing.summary_bytes,
  );
  writeUsageAtomic(runPaths, usage);
}

export function recordPhaseUsage(runPaths, phase, data) {
  const usage = readUsage(runPaths);
  const existing = usage.phases[phase] ?? {
    started_at: new Date().toISOString(),
    completed_at: null,
    events_count: 0,
    capture_bytes_raw: 0,
    capture_bytes_summary: 0,
    estimated_tokens_if_raw: 0,
    estimated_tokens_avoided: 0,
  };

  existing.events_count = data.events_count ?? existing.events_count;
  existing.capture_bytes_raw = data.capture_bytes_raw ?? existing.capture_bytes_raw;
  existing.capture_bytes_summary = data.capture_bytes_summary ?? existing.capture_bytes_summary;
  existing.estimated_tokens_if_raw = estimateTokens(existing.capture_bytes_raw);
  existing.estimated_tokens_avoided = estimateTokens(existing.capture_bytes_raw - existing.capture_bytes_summary);

  if (data.completed_at) {
    existing.completed_at = data.completed_at;
  }

  usage.phases[phase] = existing;
  recalcTotals(usage);
  writeUsageAtomic(runPaths, usage);
}

// Totals are derived from phase data, not role data — intentionally no recalcTotals here
export function recordRoleUsage(runPaths, role, data) {
  const usage = readUsage(runPaths);
  const existing = usage.roles[role] ?? {
    events_count: 0,
    capture_bytes_raw: 0,
    estimated_tokens_if_raw: 0,
  };

  existing.events_count = data.events_count ?? existing.events_count;
  existing.capture_bytes_raw = data.capture_bytes_raw ?? existing.capture_bytes_raw;
  existing.estimated_tokens_if_raw = estimateTokens(existing.capture_bytes_raw);

  usage.roles[role] = existing;
  writeUsageAtomic(runPaths, usage);
}

export function recordContextModeSavings(runPaths, statsData) {
  const usage = readUsage(runPaths);

  if (statsData.raw_kb === 0 && usage.savings.context_mode.raw_kb > 0) {
    return;
  }

  usage.savings.context_mode = {
    available: statsData.available ?? false,
    raw_kb: statsData.raw_kb ?? 0,
    context_kb: statsData.context_kb ?? 0,
    savings_ratio: statsData.savings_ratio ?? '0%',
    per_tool: statsData.per_tool ?? {},
  };

  writeUsageAtomic(runPaths, usage);
}

export function recordCompaction(runPaths, preTokens, postTokens) {
  const usage = readUsage(runPaths);
  usage.savings.compaction.compaction_count += 1;
  usage.savings.compaction.pre_compaction_tokens_est += preTokens;
  usage.savings.compaction.post_compaction_tokens_est += postTokens;
  writeUsageAtomic(runPaths, usage);
}

function formatNumber(n) {
  return n.toLocaleString('en-US');
}

export function generateReport(runPaths, format, options = {}) {
  const usage = readUsage(runPaths);

  // Filter to a single phase if requested
  if (options.phase && usage.phases[options.phase]) {
    const filtered = {
      ...usage,
      phases: { [options.phase]: usage.phases[options.phase] },
    };
    if (format === 'json') {
      return JSON.stringify(filtered, null, 2);
    }
    // Fall through to render with filtered usage
    Object.assign(usage, filtered);
  } else if (format === 'json') {
    return JSON.stringify(usage, null, 2);
  }

  const cr = usage.savings.capture_routing;
  const cm = usage.savings.context_mode;
  const co = usage.savings.compaction;

  const crRaw = cr.estimated_tokens_avoided + estimateTokens(cr.summary_bytes);
  const crAfter = estimateTokens(cr.summary_bytes);
  const cmRaw = estimateTokens(Math.round(cm.raw_kb * 1024));
  const cmAfter = estimateTokens(Math.round(cm.context_kb * 1024));
  const coSaved = co.pre_compaction_tokens_est - co.post_compaction_tokens_est;

  const withoutSavings = crRaw + cmRaw + co.pre_compaction_tokens_est;
  const saOnly = cmRaw + co.post_compaction_tokens_est + crAfter;
  const withAll = crAfter + cmAfter + co.post_compaction_tokens_est;
  const overallPct = withoutSavings > 0
    ? ((1 - withAll / withoutSavings) * 100).toFixed(1)
    : '0.0';

  let report = `# Usage Report: ${usage.run_id}\n\n`;

  report += '## Token Savings by Strategy\n';
  report += '| Strategy         | Raw (est. tokens) | After (est. tokens) | Avoided            |\n';
  report += '|------------------|--------------------|---------------------|--------------------|\n';
  report += `| Capture routing  | ${formatNumber(crRaw).padStart(18)} | ${formatNumber(crAfter).padStart(19)} | ${formatNumber(cr.estimated_tokens_avoided).padStart(18)} |\n`;
  report += `| Context-mode     | ${formatNumber(cmRaw).padStart(18)} | ${formatNumber(cmAfter).padStart(19)} | ${formatNumber(cmRaw - cmAfter).padStart(18)} |\n`;
  report += `| Compaction       | ${formatNumber(co.pre_compaction_tokens_est).padStart(18)} | ${formatNumber(co.post_compaction_tokens_est).padStart(19)} | ${formatNumber(coSaved).padStart(18)} |\n`;
  report += '\n';

  report += '## "What If" Comparison\n';
  report += '| Scenario                          | Est. tokens consumed |\n';
  report += '|-----------------------------------|----------------------|\n';
  report += `| Without any savings strategies    | ${formatNumber(withoutSavings).padStart(20)} |\n`;
  report += `| With SuperAgent savings only      | ${formatNumber(saOnly).padStart(20)} |\n`;
  report += `| With SuperAgent + context-mode    | ${formatNumber(withAll).padStart(20)} |\n`;
  report += `| **Actual savings**                | **${overallPct}%**${' '.repeat(Math.max(0, 14 - overallPct.length))} |\n`;
  report += '\n';

  const phases = Object.entries(usage.phases);
  if (phases.length > 0) {
    report += '## Phase Breakdown\n';
    report += '| Phase    | Events | Raw bytes   | Summary bytes | Est. tokens avoided |\n';
    report += '|----------|--------|-------------|---------------|---------------------|\n';
    for (const [name, p] of phases) {
      report += `| ${name.padEnd(8)} | ${String(p.events_count).padStart(6)} | ${formatNumber(p.capture_bytes_raw).padStart(11)} | ${formatNumber(p.capture_bytes_summary).padStart(13)} | ${formatNumber(p.estimated_tokens_avoided).padStart(19)} |\n`;
    }
    report += '\n';
  }

  const roles = Object.entries(usage.roles);
  if (roles.length > 0) {
    report += '## Role Breakdown\n';
    report += '| Role       | Events | Raw bytes   | Est. tokens if raw |\n';
    report += '|------------|--------|-------------|--------------------|\n';
    for (const [name, r] of roles) {
      report += `| ${name.padEnd(10)} | ${String(r.events_count).padStart(6)} | ${formatNumber(r.capture_bytes_raw).padStart(11)} | ${formatNumber(r.estimated_tokens_if_raw).padStart(18)} |\n`;
    }
    report += '\n';
  }

  report += 'Estimation method: byte heuristic (ceil(bytes/4))\n';

  return report;
}
