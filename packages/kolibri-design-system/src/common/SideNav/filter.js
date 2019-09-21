import flow from 'lodash/flow';
import words from 'lodash/words';
import lowerCase from 'lodash/lowerCase';
import deburr from 'lodash/deburr';
import every from 'lodash/every';
import includes from 'lodash/includes';

const cleanup = flow([lowerCase, deburr]);

export function termList(filterText) {
  return words(filterText).map(cleanup);
}

export function matches(termList, targetText) {
  const text = cleanup(targetText);
  return every(termList, term => includes(text, term));
}
