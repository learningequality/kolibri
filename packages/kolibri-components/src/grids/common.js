import log from 'loglevel';

export function validateAlignment(value) {
  if (!['right', 'center', 'left'].includes(value)) {
    log.error(`If provided, alignment must be one of: 'left', 'right', or 'center'`);
    return false;
  }
  return true;
}

export function validateSpan(value) {
  if (isNaN(value)) {
    log.error(`Span (${value}) must be a number`);
    return false;
  }
  const size = parseInt(value);
  if (size !== Number(value)) {
    log.error(`Span (${value}) must be an integer`);
    return false;
  }
  if (size < 1 || size > 12) {
    log.error(`Span (${value}) must be between 1 and 12`);
    return false;
  }
  return true;
}

export function validateGutter(value) {
  if (isNaN(value)) {
    log.error(`Gutter (${value}) must be an integer`);
    return false;
  }
  const size = parseInt(value);
  if (size !== Number(value)) {
    log.error(`Gutter (${value}) must be an integer`);
    return false;
  }
  if (size % 2) {
    log.error(`Gutter (${value}) must be divisible by 2`);
    return false;
  }
  return true;
}
