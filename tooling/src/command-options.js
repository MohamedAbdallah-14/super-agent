function normalizeOptionKey(name) {
  return name.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

export function parseCommandOptions(args, schema = {}) {
  const booleanOptions = new Set(schema.boolean ?? []);
  const stringOptions = new Set(schema.string ?? []);
  const positional = [];
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const optionName = arg.slice(2);
    const normalizedKey = normalizeOptionKey(optionName);

    if (booleanOptions.has(optionName)) {
      options[normalizedKey] = true;
      continue;
    }

    if (stringOptions.has(optionName)) {
      const nextValue = args[index + 1];

      if (!nextValue || nextValue.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }

      options[normalizedKey] = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return {
    positional,
    options,
  };
}

export function parsePositiveInteger(value, optionName) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer`);
  }

  return parsed;
}
