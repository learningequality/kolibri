export const FLAT_BUTTON = 'flat-button';
export const RAISED_BUTTON = 'raised-button';
export const BASIC_LINK = 'basic-link';

export function validator(appearance) {
  return [FLAT_BUTTON, RAISED_BUTTON, BASIC_LINK].includes(appearance);
}
