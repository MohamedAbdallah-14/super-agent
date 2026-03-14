import Ajv2020 from 'ajv/dist/2020.js';

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});
const validatorCache = new Map();

function formatError(error) {
  const pointer = error.instancePath || '/';
  return `${pointer} ${error.message}`;
}

export function validateAgainstSchema(schema, data) {
  const schemaKey = schema.$id ?? JSON.stringify(schema);
  let validate = validatorCache.get(schemaKey);

  if (!validate) {
    validate = ajv.compile(schema);
    validatorCache.set(schemaKey, validate);
  }

  const valid = validate(data);

  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map(formatError),
  };
}
