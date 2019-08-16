import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

export function validateAlignment(value) {
  if (!['right', 'center', 'left'].includes(value)) {
    logging.error(`If provided, alignment must be one of: 'left', 'right', or 'center'`);
    return false;
  }
  return true;
}

export function validateSpan(value) {
  if (isNaN(value)) {
    logging.error(`Span (${value}) must be a number`);
    return false;
  }
  const size = parseInt(value);
  if (size !== Number(value)) {
    logging.error(`Span (${value}) must be an integer`);
    return false;
  }
  if (size < 1 || size > 12) {
    logging.error(`Span (${value}) must be between 1 and 12`);
    return false;
  }
  return true;
}

export function validateGutter(value) {
  if (isNaN(value)) {
    logging.error(`Gutter (${value}) must be an integer`);
    return false;
  }
  const size = parseInt(value);
  if (size !== Number(value)) {
    logging.error(`Gutter (${value}) must be an integer`);
    return false;
  }
  if (size % 2) {
    logging.error(`Gutter (${value}) must be divisible by 2`);
    return false;
  }
  return true;
}
