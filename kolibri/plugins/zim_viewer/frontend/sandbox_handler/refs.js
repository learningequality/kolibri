// mwoffliner ./-prefixes colon-bearing relative refs (e.g. "Namespace:Title").
export const ABSOLUTE_URL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

export function isInternal(value) {
  return Boolean(value) && !ABSOLUTE_URL_RE.test(value);
}
