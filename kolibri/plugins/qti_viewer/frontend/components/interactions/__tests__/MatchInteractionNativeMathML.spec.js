import { fireEvent, screen, within } from '@testing-library/vue';
import { renderAssessmentItem } from '../../__tests__/helpers';
import { matchStrings } from '../MatchInteraction.vue';

const { entryEmpty$, entryFilled$, rowLabel$ } = matchStrings;

const MATH_NS = 'http://www.w3.org/1998/Math/MathML';
const ROOT_ALTTEXT = 'square root of 16';
const SQUARE_ALTTEXT = 'x squared';

const xml = `<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="match-math" title="Match math" adaptive="false" time-dependent="false">
    <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair"/>
    <qti-item-body>
      <qti-match-interaction response-identifier="RESPONSE" max-associations="1">
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="S" match-max="1"><math xmlns="${MATH_NS}" alttext="${ROOT_ALTTEXT}"><msqrt><mn>16</mn></msqrt></math></qti-simple-associable-choice>
        </qti-simple-match-set>
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="T" match-max="1"><math xmlns="${MATH_NS}" alttext="${SQUARE_ALTTEXT}"><msup><mi>x</mi><mn>2</mn></msup></math></qti-simple-associable-choice>
        </qti-simple-match-set>
      </qti-match-interaction>
    </qti-item-body>
  </qti-assessment-item>`;

describe('MathML choices when the browser lays out MathML', () => {
  beforeEach(() => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 77, height: 23 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names rows, entries and options by native math alttext', async () => {
    renderAssessmentItem(xml);
    await fireEvent.focus(screen.getByLabelText(entryEmpty$({ source: ROOT_ALTTEXT })));
    expect(screen.queryByTestId('mathjax-output')).not.toBeInTheDocument();
    expect(screen.getByLabelText(rowLabel$({ source: ROOT_ALTTEXT }))).toBeVisible();
    const entry = screen.getByLabelText(
      entryFilled$({ number: 1, source: ROOT_ALTTEXT, response: SQUARE_ALTTEXT }),
    );
    expect(within(entry).getByRole('option', { name: SQUARE_ALTTEXT })).toBeInTheDocument();
  });
});
