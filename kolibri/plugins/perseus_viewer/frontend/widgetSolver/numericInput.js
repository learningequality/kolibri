import { Fraction } from 'fractional';

// Taken from https://github.com/ekg/fraction.js/blob/master/index.js
// as not in released version of fractional.

Fraction.prototype.snap = function (max, threshold) {
  if (!threshold) threshold = 0.0001;
  if (!max) max = 100;

  var negative = this.numerator < 0;
  var decimal = this.numerator / this.denominator;
  var fraction = Math.abs(decimal % 1);
  var remainder = negative ? Math.ceil(decimal) : Math.floor(decimal);

  for (var denominator = 1; denominator <= max; ++denominator) {
    for (var numerator = 0; numerator <= max; ++numerator) {
      var approximation = Math.abs(numerator / denominator);
      if (Math.abs(approximation - fraction) < threshold) {
        return new Fraction(remainder * denominator + numerator * (negative ? -1 : 1), denominator);
      }
    }
  }

  return new Fraction(this.numerator, this.denominator);
};

const FRACTION_FORMS = ['proper', 'improper', 'mixed'];

// perseus-score's KhanAnswerTypes adds this epsilon to every maxError.
const MAXERROR_EPSILON = Math.pow(2, -42);

function isExponential(value) {
  return value.toString().includes('e');
}

function decimalString(value) {
  if (!isExponential(value)) {
    return value.toString();
  }
  const [mantissa] = value.toString().split('e');
  return value.toLocaleString('en', {
    useGrouping: false,
    maximumSignificantDigits: mantissa.replace(/[-.]/g, '').length,
  });
}

function snap(value, maxError) {
  if (isExponential(value)) {
    return null;
  }
  const fraction = new Fraction(value).snap(100);
  const matches = Math.abs(fraction.numerator / fraction.denominator - value) < maxError;
  return matches ? fraction : null;
}

function improperFraction(fraction) {
  return fraction.denominator > 1
    ? `${fraction.numerator}/${fraction.denominator}`
    : `${fraction.numerator}`;
}

function formatAnswer(value, { strict, answerForms, maxError }, preferFraction = false) {
  const forms = strict && answerForms?.length ? answerForms : null;
  const tolerance = (maxError || 0) + MAXERROR_EPSILON;
  if (forms?.includes('pi')) {
    const piMultiple = snap(value / Math.PI, tolerance / Math.PI);
    if (piMultiple) {
      return `${improperFraction(piMultiple)}π`;
    }
  }
  const allowsDecimal =
    !forms || forms.includes('decimal') || (forms.includes('integer') && Number.isInteger(value));
  const allowsFraction = !forms || forms.some(form => FRACTION_FORMS.includes(form));
  const fraction = snap(value, tolerance);
  if (
    !fraction ||
    fraction.denominator === 1 ||
    !allowsFraction ||
    (allowsDecimal && !preferFraction)
  ) {
    return decimalString(value);
  }
  return forms && !forms.includes('mixed') ? improperFraction(fraction) : fraction.toString();
}

export default (rubric, preferFraction) => {
  const answer = rubric.answers.find(answer => answer.status === 'correct');
  const value = answer.value == null ? NaN : Number(answer.value);
  if (!Number.isFinite(value)) {
    throw new TypeError('The correct numeric-input answer has no numeric value');
  }
  return {
    currentValue: formatAnswer(value, answer, preferFraction),
  };
};
