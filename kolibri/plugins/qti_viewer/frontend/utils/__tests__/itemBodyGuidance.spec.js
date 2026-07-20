import { parseXML } from '../xml';
import { getItemBodyGuides, numberPassageGaps } from '../itemBodyGuidance';
import { answerGuideStrings } from '../../components/AnswerGuide.vue';

function itemBody(innerXML) {
  const xml = `<qti-assessment-item
      xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
      identifier="t" title="t" adaptive="false" time-dependent="false">
      <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"/>
      <qti-item-body>${innerXML}</qti-item-body>
    </qti-assessment-item>`;
  return parseXML(xml).querySelector('qti-item-body');
}

describe('getItemBodyGuides', () => {
  it('returns the inline-choice guide when the item body contains an inline-choice gap', () => {
    const body = itemBody(`
      <p>Pick <qti-inline-choice-interaction response-identifier="RESPONSE">
        <qti-inline-choice identifier="A">Alpha</qti-inline-choice>
      </qti-inline-choice-interaction>.</p>
    `);
    expect(getItemBodyGuides(body)).toEqual([answerGuideStrings.inlineChoice$()]);
  });

  it('returns no guide for an item body without inline interactions', () => {
    const body = itemBody('<p>Just a passage with no interactions.</p>');
    expect(getItemBodyGuides(body)).toEqual([]);
  });

  it('returns an empty list when given no item body node', () => {
    expect(getItemBodyGuides(null)).toEqual([]);
  });
});

describe('numberPassageGaps', () => {
  // Parse the returned markup back and read the position attributes off each gap.
  function gapAttrs(markup) {
    const gaps = parseXML(`<root>${markup}</root>`).querySelectorAll(
      'qti-inline-choice-interaction',
    );
    return Array.from(gaps).map(el => [
      el.getAttribute('data-gap-number'),
      el.getAttribute('data-gap-count'),
    ]);
  }

  it('tags each gap with its 1-based position and the total gap count, in document order', () => {
    const body = itemBody(`
      <p>A <qti-inline-choice-interaction response-identifier="R1">
        <qti-inline-choice identifier="A">Alpha</qti-inline-choice>
      </qti-inline-choice-interaction>
      and B <qti-inline-choice-interaction response-identifier="R2">
        <qti-inline-choice identifier="B">Bravo</qti-inline-choice>
      </qti-inline-choice-interaction>.</p>
    `);
    expect(gapAttrs(numberPassageGaps(body))).toEqual([
      ['1', '2'],
      ['2', '2'],
    ]);
  });

  it('leaves markup without inline-choice gaps unchanged', () => {
    const body = itemBody('<p>No interactions here.</p>');
    const markup = numberPassageGaps(body);
    expect(markup).toContain('No interactions here.');
    expect(markup).not.toContain('data-gap-number');
  });

  it('returns an empty string when given no item body node', () => {
    expect(numberPassageGaps(null)).toBe('');
  });
});
