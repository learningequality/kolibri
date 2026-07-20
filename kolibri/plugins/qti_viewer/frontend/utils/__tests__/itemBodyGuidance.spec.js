import { parseXML } from '../xml';
import { getItemBodyGuides } from '../itemBodyGuidance';
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
