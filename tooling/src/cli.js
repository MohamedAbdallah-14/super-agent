#!/usr/bin/env node

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { runCaptureCommand } from './capture/command.js';
import { runValidateCommand } from './commands/validate.js';
import { runDoctorCommand } from './doctor/command.js';
import { runExportCommand as runGeneratedExportCommand } from './export/command.js';
import { runIndexCommand } from './index/command.js';
import { runRecallCommand } from './recall/command.js';
import { runStatusCommand } from './status/command.js';

const COMMAND_FAMILIES = [
  'export',
  'validate',
  'doctor',
  'index',
  'recall',
  'status',
  'capture'
];

const COMMAND_HANDLERS = {
  export: runGeneratedExportCommand,
  validate: runValidateCommand,
  doctor: runDoctorCommand,
  index: runIndexCommand,
  recall: runRecallCommand,
  status: runStatusCommand,
  capture: runCaptureCommand,
};

export function parseArgs(argv) {
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
    return {
      command: null,
      subcommand: null,
      args: [],
      help: true
    };
  }

  const [command, maybeSubcommand, ...rest] = argv;
  const hasSubcommand = maybeSubcommand && !maybeSubcommand.startsWith('-');

  return {
    command,
    subcommand: hasSubcommand ? maybeSubcommand : null,
    args: hasSubcommand ? rest : [maybeSubcommand, ...rest].filter(Boolean),
    help: false
  };
}

export function renderHelp() {
  return [
    'superagent',
    '',
    'Host-native engineering OS kit CLI',
    '',
    'Commands:',
    ...COMMAND_FAMILIES.map((name) => `  - ${name}`)
  ].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);

  if (parsed.help || !parsed.command) {
    console.log(renderHelp());
    return 0;
  }

  if (!COMMAND_FAMILIES.includes(parsed.command)) {
    console.error(`Unknown command: ${parsed.command}`);
    return 1;
  }

  const handler = COMMAND_HANDLERS[parsed.command];

  if (!handler) {
    console.error(`superagent ${parsed.command} is not implemented yet`);
    return 2;
  }

  let result;

  try {
    result = handler(parsed);
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result.exitCode;
}

function isDirectExecution() {
  if (!process.argv[1]) {
    return false;
  }

  return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
}

if (isDirectExecution()) {
  process.exitCode = main();
}
