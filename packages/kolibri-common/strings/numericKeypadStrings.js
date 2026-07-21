import { createTranslator } from 'kolibri/utils/i18n';

export default createTranslator('NumericKeypadStrings', {
  upArrow: 'Up arrow',
  downArrow: 'Down arrow',
  leftArrow: 'Left arrow',
  rightArrow: 'Right arrow',
  dismiss: {
    message: 'Dismiss',
    context: 'A label for a button that will dismiss/hide a keypad.',
  },
  plus: {
    message: 'Plus',
    context: "A label for a 'plus' sign.",
  },
  minus: {
    message: 'Minus',
    context: "A label for a 'minus' sign.",
  },
  negative: {
    message: 'Negative',
    context: "A label for a 'negative' sign.",
  },
  times: {
    message: 'Multiply',
    context: "A label for a 'multiply' sign.",
  },
  divide: {
    message: 'Divide',
    context: "A label for a 'divide' sign.",
  },
  decimal: {
    message: 'Decimal',
    context: "A label for a 'decimal' sign (represented as '.' or ',').",
  },
  percent: {
    message: 'Percent',
    context: "A label for a 'percent' sign (represented as '%').",
  },
  equalsSign: {
    message: 'Equals sign',
    context: "A label for an 'equals' sign (represented as '=').",
  },
  fractionExcludingExpression: {
    message: 'Fraction, excluding the current expression',
    context: 'A label for a button that creates a new fraction next to the cursor.',
  },
  customExponent: {
    message: 'Custom exponent',
    context: 'A label for a button that will allow the user to input a custom exponent.',
  },
  squareRoot: {
    message: 'Square root',
    context: 'A label for a button that will allow the user to input a square root.',
  },
  leftParenthesis: {
    message: 'Left parenthesis',
    context: "A label for a button that will allow the user to input a left parenthesis (i.e. '(')",
  },
  rightParenthesis: {
    message: 'Right parenthesis',
    context:
      "A label for a button that will allow the user to input a right parenthesis (i.e. ')')",
  },
  pi: {
    message: 'Pi',
    context:
      'A label for a button that will allow the user to input the mathematical constant pi (i.e., π)',
  },
  delete: 'Delete',
});
