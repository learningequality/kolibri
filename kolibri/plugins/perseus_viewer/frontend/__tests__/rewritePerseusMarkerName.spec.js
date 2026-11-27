import fs from 'node:fs';
import path from 'node:path';
import transformPerseusForJest from './transformPerseusForJest';

const OPENER = '{role:"button","aria-expanded":opened,';
const LABELLED_OPENER = '{role:"button","aria-label":';
const INNER_LABEL = '"aria-label":markerDisabled?this.context.strings.correctExcited:label,';

function occurrences(source, snippet) {
  return source.split(snippet).length - 1;
}

const perseusMain = require.resolve('@khanacademy/perseus');

describe.each([perseusMain, path.join(path.dirname(perseusMain), 'es', 'index.js')])(
  'build pre-loaders on %s',
  file => {
    const source = fs.readFileSync(file, 'utf8');
    const output = transformPerseusForJest.process(source, file).code;

    it('labels the marker opener', () => {
      expect(occurrences(output, OPENER)).toBe(0);
      expect(occurrences(output, LABELLED_OPENER)).toBe(occurrences(source, LABELLED_OPENER) + 1);
    });

    it('drops the label from the inner marker view', () => {
      expect(occurrences(source, INNER_LABEL)).toBe(1);
      expect(occurrences(output, INNER_LABEL)).toBe(0);
    });
  },
);
