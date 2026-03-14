import fs from 'node:fs';
import path from 'node:path';

export function evaluateLoopCapGuard(payload) {
  const runId = payload.run_id;
  const phase = payload.phase;
  const stateRoot = payload.state_root;
  const loopCap = payload.loop_cap;

  if (!runId) {
    throw new Error('run_id is required');
  }

  if (!phase) {
    throw new Error('phase is required');
  }

  if (!stateRoot) {
    throw new Error('state_root is required');
  }

  if (!Number.isInteger(loopCap) || loopCap < 1) {
    throw new Error('loop_cap must be a positive integer');
  }

  const statusPath = path.join(stateRoot, 'runs', runId, 'status.json');

  if (!fs.existsSync(statusPath)) {
    throw new Error(`status.json not found for run ${runId}`);
  }

  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  const currentLoopCount = status.phase_loop_counts?.[phase] ?? 0;

  if (currentLoopCount >= loopCap) {
    return {
      allowed: false,
      reason: `Loop cap reached for phase ${phase}: ${currentLoopCount}/${loopCap}`,
      current_loop_count: currentLoopCount,
      loop_cap: loopCap,
      status_path: statusPath,
    };
  }

  return {
    allowed: true,
    reason: `Loop count ${currentLoopCount}/${loopCap} is within cap for phase ${phase}.`,
    current_loop_count: currentLoopCount,
    loop_cap: loopCap,
    status_path: statusPath,
  };
}
