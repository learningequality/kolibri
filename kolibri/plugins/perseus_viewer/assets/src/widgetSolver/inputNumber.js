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

export default (widget, rubric) => {
  let value = rubric.value;
  if (rubric.simplify === 'required') {
    const simplified = new Fraction(value).snap(100, rubric.inExact);
    if (simplified.denominator > 1) {
      value = simplified;
    }
  }

  widget.setInputValue('', value.toString());
};
