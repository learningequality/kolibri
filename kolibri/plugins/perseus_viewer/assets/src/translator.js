import { createTranslator } from 'kolibri/utils/i18n';

export default createTranslator('PerseusInternalMessages', {
  closeKeypad: 'close math keypad',
  openKeypad: 'open math keypad',
  removeHighlight: 'Remove highlight',
  addHighlight: 'Add highlight',
  hintPos: 'Hint #{ pos }',
  errorRendering: 'Error rendering: { error }',
  APPROXIMATED_PI_ERROR:
    'Your answer is close, but you may have approximated pi. Enter your answer as a multiple of pi, like <code>12\\\\ \\\\text[pi]</code> or <code>2/3\\\\ \\\\text[pi]</code>',
  EXTRA_SYMBOLS_ERROR:
    'We could not understand your answer. Please check your answer for extra text or symbols.',
  NEEDS_TO_BE_SIMPLFIED_ERROR: 'Your answer is almost correct, but it needs to be simplified.',
  MISSING_PERCENT_ERROR:
    'Your answer is almost correct, but it is missing a <code>\\\\%</code> at the end.',
  MULTIPLICATION_SIGN_ERROR: {
    message:
      "I'm a computer. I only understand multiplication if you use an asterisk (*) as the multiplication sign.",
    context:
      'Feel free to skip translating the first sentence, just make clear the necessity to use the asterisk (*) as the multiplication sign.',
  },
  WRONG_CASE_ERROR: {
    message: 'Your answer includes use of a variable with the wrong case.',
    context: 'Refers to capitalization of the variables.',
  },
  WRONG_LETTER_ERROR: {
    message: 'Your answer includes a wrong variable letter.',
    context:
      "Refers to variables in algebra, and assumes that the variable name is always just one letter (like 'a' , 'b', etc.) ",
  },
  invalidSelection: 'Make sure you select something for every row.',
  ERROR_TITLE: 'Oops!',
  ERROR_MESSAGE: "Sorry, I don't understand that!",
  hints: 'Hints',
  getAnotherHint: 'Get another hint',
  deprecatedStandin:
    "Sorry, this part of the question is no longer available. 😅 Don't worry, you won't be graded on this part. Keep going!",
  keepTrying: 'Keep trying',
  tryAgain: 'Try again',
  check: 'Check',
  correctExcited: 'Correct!',
  nextQuestion: 'Next question',
  skipToTitle: 'Skip to { title }',
  current: 'Current',
  correct: 'Correct',
  correctSelected: 'Correct (selected)',
  correctCrossedOut: 'Correct (but you crossed it out)',
  incorrect: 'Incorrect',
  incorrectSelected: 'Incorrect (selected)',
  hideExplanation: 'Hide explanation',
  explain: 'Explain',
  INVALID_MESSAGE_PREFIX: "We couldn't grade your answer.",
  DEFAULT_INVALID_MESSAGE_1: 'It looks like you left something blank or ',
  DEFAULT_INVALID_MESSAGE_2: 'entered in an invalid answer.',
  integerExample: 'an integer, like $6$',
  properExample: 'a *proper* fraction, like $1/2$ or $6/10$',
  simplifiedProperExample: 'a *simplified proper* fraction, like $3/5$',
  improperExample: 'an *improper* fraction, like $10/7$ or $14/8$',
  simplifiedImproperExample: 'a *simplified improper* fraction, like $7/4$',
  mixedExample: 'a mixed number, like $1\\\\ 3/4$',
  decimalExample: 'an *exact* decimal, like $0.75$',
  percentExample: 'a percent, like $12.34\\\\%$',
  piExample: 'a multiple of pi, like $12\\\\ \\\\text[pi]$ or $2/3\\\\ \\\\text[pi]$',
  yourAnswer: '**Your answer should be** ',
  yourAnswerLabel: 'Your answer:',
  addPoints: 'Click to add points',
  addVertices: 'Click to add vertices',
  tapMultiple: 'Tap each dot on the image to select all answers that apply.',
  tapSingle: 'Tap each dot on the image to select an answer.',
  clickMultiple: 'Click each dot on the image to select all answers that apply.',
  clickSingle: 'Click each dot on the image to select an answer.',
  choices: 'Choices:',
  answers: '{num, plural, one {{ num } answer} other {{ num } answers}}',
  hideAnswersToggleLabel: 'Hide answer choices',
  moves: '{num, plural, one {Moves: { num }} other {Moves: { num }}}',
  clickTiles: 'Click on the tiles to change the lights.',
  turnOffLights: 'You must turn on all of the lights to continue.',
  fillAllCells: 'Make sure you fill in all cells in the matrix.',
  molecularDrawing: {
    message: 'A molecular structure drawing. SMILES notation: { content }',
    context:
      'SMILES refer to https://en.wikipedia.org/wiki/Simplified_molecular-input_line-entry_system',
  },
  switchDirection: 'Switch direction',
  circleOpen: 'Make circle open',
  circleFilled: 'Make circle filled',
  numDivisions: 'Number of divisions:',
  divisions: 'Please make sure the number of divisions is in the range { divRangeString }.',
  lineRange: 'lines { lineRange }',
  lineNumber: 'line { lineNumber }',
  symbolPassage:
    'The symbol { questionSymbol } indicates that question { questionNumber } references this portion of the passage.',
  symbolQuestion:
    ' The symbol { sentenceSymbol } indicates that the following sentence is referenced in a question.',
  lineLabel: {
    message: 'Line',
    context: 'a label next to a reading passage to denote the line number',
  },
  beginningPassage: 'Beginning of reading passage.',
  beginningFootnotes: 'Beginning of reading passage footnotes.',
  endPassage: 'End of reading passage.',
  questionMarker: '[Marker for question { number }]',
  circleMarker: '[Circle marker { number }]',
  sentenceMarker: '[Sentence { number }]',
  dragHandles: 'Drag handles to make graph',
  tapAddPoints: 'Tap to add points',
  false: 'False',
  true: 'True',
  no: 'No',
  yes: 'Yes',
  chooseCorrectNum: 'Please choose the correct number of answers.',
  notNoneOfTheAbove: "'None of the above' may not be selected when other answers are selected.",
  noneOfTheAbove: 'None of the above',
  chooseNumAnswers: 'Choose { numCorrect } answers:',
  chooseAllAnswers: 'Choose all answers that apply:',
  chooseOneAnswer: 'Choose 1 answer:',
  choiceCheckedCorrect: '(Choice { letter }, Checked, Correct)',
  choiceCrossedOutCorrect: '(Choice { letter }, Crossed out, Correct)',
  choiceCorrect: '(Choice { letter }, Correct)',
  choiceCheckedIncorrect: '(Choice { letter }, Checked, Incorrect)',
  choiceCrossedOutIncorrect: '(Choice { letter }, Crossed out, Incorrect)',
  choiceIncorrect: '(Choice { letter }, Incorrect)',
  choiceChecked: '(Choice { letter }, Checked)',
  choiceCrossedOut: '(Choice { letter }, Crossed out)',
  choice: '(Choice { letter })',
  crossOut: 'Cross out',
  crossOutOption: {
    message: 'Cross out option',
    context:
      'Tooltip that informs the user that they can cross-out one of the options in the multiple choice type of question.',
  },
  crossOutChoice: 'Cross out Choice { letter }',
  bringBack: {
    message: 'Bring back',
    context:
      'Tooltip that informs the user that they can revert the crossing out they performed on an  options in the multiple choice type of question.',
  },
  openMenuForChoice: {
    message: 'Open menu for Choice { letter }',
    context:
      "'Choice' refers to the option/answer the user has previously chosen in a multiple choice type of a question. Some of the answers may have a menu available and this string is the label indicating that the user can open that menu.",
  },
  letters: {
    message: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
    context:
      'This is a list of single-character labels that will appear in front of multiple-choice options. For instance, a multiple-choice question with three options would display (A) first option (B) second option (C) third option. There must be spaces between each of the different characters. The characters will show up next to options in the order that they are listed here. Most multiple choice questions have 5 or fewer options.',
  },
  rightArrow: 'Right arrow',
  dontUnderstandUnits: "I couldn't understand those units.",
  checkSigFigs: 'Check your significant figures.',
  answerNumericallyIncorrect: 'That answer is numerically incorrect.',
  checkUnits: 'Check your units.',
  dontUnderstand: "I don't understand that",
  loading: 'Loading...',
  videoTranscript: 'See video transcript',
  somethingWrong: 'Something went wrong.',
  videoWrapper: 'Khan Academy video wrapper',
  mathInputBox: 'Math input box',
  fingerTap: 'Tap with one or two fingers to open keyboard',
  before: 'before { obj }',
  after: 'after { obj }',
  'beginning of': 'beginning of { obj }',
  'end of': 'end of { obj }',
  Baseline: 'Baseline',
  Superscript: 'Superscript',
  selected: '{ obj } selected',
  'no answer': 'no answer',
  'nothing selected': 'nothing selected',
  'nothing to the right': 'nothing to the right',
  'nothing to the left': 'nothing to the left',
  'block is empty': 'block is empty',
  'nothing above': 'nothing above',
  labelValue: '{ label }: { value }',
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
  cdot: {
    message: 'Multiply',
    context: "A label for a 'centered dot' multiplication sign (represented as '⋅').",
  },
  equalsSign: {
    message: 'Equals sign',
    context: "A label for an 'equals' sign (represented as '=').",
  },
  notEqualsSign: {
    message: 'Not-equals sign',
    context: "A label for a 'not-equals' sign (represented as '≠').",
  },
  greaterThanSign: {
    message: 'Greater than sign',
    context: "A label for a 'greater than' sign (represented as '>').",
  },
  lessThanSign: {
    message: 'Less than sign',
    context: "A label for a 'less than' sign (represented as '<').",
  },
  greaterThanOrEqualToSign: {
    message: 'Greater than or equal to sign',
    context: "A label for a 'greater than or equal to' sign (represented as '≥').",
  },
  lessThanOrEqualSign: {
    message: 'Less than or equal to sign',
    context: "A label for a 'less than or equal to' sign (represented as '≤').",
  },
  fractionExpressionInNumerator: {
    message: 'Fraction, with current expression in numerator',
    context:
      'A label for a button that creates a new fraction and puts the current expression in the numerator of that fraction.',
  },
  fractionExcludingExpression: {
    message: 'Fraction, excluding the current expression',
    context: 'A label for a button that creates a new fraction next to the cursor.',
  },
  customExponent: {
    message: 'Custom exponent',
    context: 'A label for a button that will allow the user to input a custom exponent.',
  },
  square: {
    message: 'Square',
    context: 'A label for a button that will square (take to the second power) some math.',
  },
  cube: {
    message: 'Cube',
    context: 'A label for a button that will cube (take to the third power) some math.',
  },
  squareRoot: {
    message: 'Square root',
    context: 'A label for a button that will allow the user to input a square root.',
  },
  cubeRoot: {
    message: 'Cube root',
    context: 'A label for a button that will allow the user to input a cube root.',
  },
  radicalWithCustomRoot: {
    message: 'Radical with custom root',
    context: 'A label for a button that will allow the user to input a radical with a custom root.',
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
  naturalLog: {
    message: 'Natural logarithm',
    context: 'A label for a button that will allow the user to input a natural logarithm.',
  },
  logBase10: {
    message: 'Logarithm with base 10',
    context: 'A label for a button that will allow the user to input a logarithm with base 10.',
  },
  logCustomBase: {
    message: 'Logarithm with custom base',
    context:
      'A label for a button that will allow the user to input a logarithm with a custom base.',
  },
  sine: {
    message: 'Sine',
    context: 'A label for a button that will allow the user to input a sine function.',
  },
  cosine: {
    message: 'Cosine',
    context: 'A label for a button that will allow the user to input a cosine function.',
  },
  tangent: {
    message: 'Tangent',
    context: 'A label for a button that will allow the user to input a tangent function.',
  },
  pi: {
    message: 'Pi',
    context:
      'A label for a button that will allow the user to input the mathematical constant pi (i.e., π)',
  },
  theta: {
    message: 'Theta',
    context:
      'A label for a button that will allow the user to input the mathematical constant theta (i.e., θ)',
  },
  upArrow: 'Up arrow',
  downArrow: 'Down arrow',
  leftArrow: 'Left arrow',
  navOutOfParentheses: 'Navigate right out of a set of parentheses',
  navOutOfExponent: 'Navigate right out of an exponent',
  navOutOfBase: 'Navigate right out of a base',
  navIntoNumerator: 'Navigate right into the numerator of a fraction',
  navOutOfNumeratorIntoDenominator: 'Navigate right out of the numerator and into the denominator',
  navOutOfDenominator: 'Navigate right out of the denominator of a fraction',
  delete: 'Delete',
  dismiss: {
    message: 'Dismiss',
    context: 'A label for a button that will dismiss/hide a keypad.',
  },
});
