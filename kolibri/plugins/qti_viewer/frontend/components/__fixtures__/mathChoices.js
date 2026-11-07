const MATCH_CORRECT = 'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml';

export default {
  'match-mathml': {
    xml: `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="match-mathml" title="Match - MathML" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>
      <qti-value>SQUARE AREA</qti-value>
      <qti-value>ROOT FOUR</qti-value>
      <qti-value>HALF PART</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-match-interaction response-identifier="RESPONSE" max-associations="3">
      <qti-prompt>Match each expression to what it names.</qti-prompt>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="SQUARE" match-max="1"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext="x squared"><msup><mi>x</mi><mn>2</mn></msup></math></qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="ROOT" match-max="1"><math xmlns="http://www.w3.org/1998/Math/MathML" aria-label=" " alttext="square root of 16"><msqrt><mn>16</mn></msqrt></math></qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="HALF" match-max="1"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext=" "><mfrac><mn>1</mn><mn>2</mn></mfrac></math></qti-simple-associable-choice>
      </qti-simple-match-set>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="AREA" match-max="1">Area of a square</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="FOUR" match-max="1">Four <math xmlns="http://www.w3.org/1998/Math/MathML" aria-hidden="true" alttext="decor"><mo>★</mo></math></qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="PART" match-max="1">One part in two</qti-simple-associable-choice>
      </qti-simple-match-set>
    </qti-match-interaction>
  </qti-item-body>
  <qti-response-processing template="${MATCH_CORRECT}"/>
</qti-assessment-item>`,
  },
  'associate-mathml': {
    xml: `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="associate-mathml" title="Associate - MathML" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="pair">
    <qti-correct-response>
      <qti-value>ROOT FOUR</qti-value>
      <qti-value>SQUARE TIMES</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-associate-interaction response-identifier="RESPONSE" max-associations="2">
      <qti-prompt>Pair each expression with an equal one.</qti-prompt>
      <qti-simple-associable-choice identifier="ROOT" match-max="1"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext="square root of 16"><msqrt><mn>16</mn></msqrt></math></qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="FOUR" match-max="1"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math></qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="SQUARE" match-max="1"><math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="x squared" alttext="x to the power 2"><msup><mi>x</mi><mn>2</mn></msup></math></qti-simple-associable-choice>
      <qti-simple-associable-choice identifier="TIMES" match-max="1"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext="x times x"><mi>x</mi><mo>×</mo><mi>x</mi></math></qti-simple-associable-choice>
    </qti-associate-interaction>
  </qti-item-body>
  <qti-response-processing template="${MATCH_CORRECT}"/>
</qti-assessment-item>`,
  },
  'order-mathml': {
    xml: `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="order-mathml" title="Order - MathML" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier">
    <qti-correct-response>
      <qti-value>HALF</qti-value>
      <qti-value>ROOT</qti-value>
      <qti-value>SQUARE</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-order-interaction response-identifier="RESPONSE" shuffle="true">
      <qti-prompt>Order from smallest to largest, for x = 5.</qti-prompt>
      <qti-simple-choice identifier="SQUARE"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext="x squared"><msup><mi>x</mi><mn>2</mn></msup></math></qti-simple-choice>
      <qti-simple-choice identifier="ROOT"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext="square root of 16"><msqrt><mn>16</mn></msqrt></math></qti-simple-choice>
      <qti-simple-choice identifier="HALF"><math xmlns="http://www.w3.org/1998/Math/MathML" alttext="one half"><mfrac><mn>1</mn><mn>2</mn></mfrac></math></qti-simple-choice>
    </qti-order-interaction>
  </qti-item-body>
  <qti-response-processing template="${MATCH_CORRECT}"/>
</qti-assessment-item>`,
  },
};
