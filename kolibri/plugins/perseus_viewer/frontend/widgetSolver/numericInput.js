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

const MAX_DENOMINATOR = 100;

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

// fractional's normalize() throws on a non-integer that rounds to an integer at 9 places.
function toFraction(value) {
  return new Fraction(Math.round(value * 1e9) / 1e9);
}

function snap(value, maxError) {
  if (isExponential(value)) {
    return null;
  }
  const fraction = toFraction(value).snap(MAX_DENOMINATOR);
  const matches =
    fraction.denominator <= MAX_DENOMINATOR &&
    Math.abs(fraction.numerator / fraction.denominator - value) < maxError;
  return matches ? fraction : null;
}

// Returns the fraction with the smallest denominator in the open interval (lo, hi), 0 <= lo,
// or null when floating point leaves the interval empty.
function simplestBetween(lo, hi) {
  if (lo >= hi) {
    return null;
  }
  const whole = Math.floor(lo);
  if (whole + 1 < hi) {
    return [whole + 1, 1];
  }
  const inner = simplestBetween(1 / (hi - whole), 1 / (lo - whole));
  return inner && [whole * inner[0] + inner[1], inner[0]];
}

function exactFraction(value) {
  let [previousNumerator, numerator] = [0, 1];
  let [previousDenominator, denominator] = [1, 0];
  let remainder = value;
  for (;;) {
    const term = Math.floor(remainder);
    [previousNumerator, numerator] = [numerator, term * numerator + previousNumerator];
    [previousDenominator, denominator] = [denominator, term * denominator + previousDenominator];
    if (numerator / denominator === value || remainder === term) {
      return [numerator, denominator];
    }
    remainder = 1 / (remainder - term);
  }
}

function closestFraction(value, maxError) {
  const magnitude = Math.abs(value);
  if (magnitude < maxError) {
    return new Fraction(0, 1);
  }
  const [numerator, denominator] =
    simplestBetween(magnitude - maxError, magnitude + maxError) || exactFraction(magnitude);
  return new Fraction(Math.sign(value) * numerator, denominator);
}

function improperFraction(fraction) {
  return fraction.denominator > 1
    ? `${fraction.numerator}/${fraction.denominator}`
    : `${fraction.numerator}`;
}

function piMultipleString({ numerator, denominator }) {
  if (numerator === 0) {
    return '0';
  }
  const coefficient = Math.abs(numerator) === 1 ? '' : Math.abs(numerator);
  const sign = numerator < 0 ? '-' : '';
  return `${sign}${coefficient}π${denominator > 1 ? `/${denominator}` : ''}`;
}

function formatAnswer(value, { strict, answerForms, maxError }, preferFraction = false) {
  const forms = strict && answerForms?.length ? answerForms : null;
  const tolerance = (maxError || 0) + MAXERROR_EPSILON;
  if (forms?.includes('pi')) {
    const piMultiple = snap(value / Math.PI, tolerance / Math.PI);
    if (piMultiple) {
      return piMultipleString(piMultiple);
    }
  }
  // perseus-score scores the integer form inexactly, so it accepts any decimal.
  const allowsDecimal = !forms || forms.includes('decimal') || forms.includes('integer');
  const allowsFraction = !forms || forms.some(form => FRACTION_FORMS.includes(form));
  const fraction = snap(value, tolerance) || (!allowsDecimal && closestFraction(value, tolerance));
  if (
    !fraction ||
    fraction.denominator === 1 ||
    !allowsFraction ||
    (allowsDecimal && !preferFraction)
  ) {
    return decimalString(value);
  }
  if (forms && !forms.includes('proper') && Math.abs(value) < 1) {
    return `${value < 0 ? '-' : ''}0 ${Math.abs(fraction.numerator)}/${fraction.denominator}`;
  }
  return forms?.includes('mixed') && !forms.includes('improper')
    ? fraction.toString()
    : improperFraction(fraction);
}

export default (rubric, preferFraction) => {
  const answer = rubric.answers.find(answer => answer.status === 'correct' && answer.value != null);
  const value = Number(answer?.value);
  if (!Number.isFinite(value)) {
    throw new TypeError('The correct numeric-input answer has no numeric value');
  }
  return {
    currentValue: formatAnswer(value, answer, preferFraction),
  };
};
