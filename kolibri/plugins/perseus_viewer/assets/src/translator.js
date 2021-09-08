import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('PerseusInternalMessages', {
  Hints: {
    message: 'Hints',
    context: 'A hint is a suggestion to help learners solve a problem.\n',
  },
  'Get another hint': 'Get another hint',
  'Hint #{ pos }': 'Hint #{ pos }',
  'an integer, like $6$': 'an integer, like $6$',
  'a *proper* fraction, like $1/2$ or $6/10$': 'a *proper* fraction, like $1/2$ or $6/10$',
  'a *simplified proper* fraction, like $3/5$': 'a *simplified proper* fraction, like $3/5$',
  'an *improper* fraction, like $10/7$ or $14/8$': 'an *improper* fraction, like $10/7$ or $14/8$',
  'a *simplified improper* fraction, like $7/4$': 'a *simplified improper* fraction, like $7/4$',
  'a mixed number, like $1 3/4$': 'a mixed number, like $1\\\\ 3/4$',
  'an *exact* decimal, like $0.75$': 'an *exact* decimal, like $0.75$',
  'a percent, like $12.34%$': 'a percent, like $12.34\\\\%$',
  'a multiple of pi, like $12 text{pi}$ or $2/3 text{pi}$':
    'a multiple of pi, like $12\\\\ \\\\text{pi}$ or $2/3\\\\ \\\\text{pi}$',
  '**Your answer should be** ': '**Your answer should be** ',
  'Your answer:': 'Your answer:',
  '0 solutions': '0 solutions',
  'Finite solutions': 'Finite solutions',
  "Sorry, I don't understand that!": "Sorry, I don't understand that!",
  'Make sure you select something for every row.': 'Make sure you select something for every row.',
  Check: {
    message: 'Check',
    context:
      "Learners use the 'Check' button when doing an exercise to check if they have answered a question correctly or not.\n",
  },
  'Next question': 'Next question',
  'Hide explanation': 'Hide explanation',
  Explain: 'Explain',
  'Click to add points': 'Click to add points',
  'Click to add vertices': 'Click to add vertices',
  'Click on the tiles to change the lights.': 'Click on the tiles to change the lights.',
  'You must turn on all of the lights to continue.':
    'You must turn on all of the lights to continue.',
  'Make sure you fill in all cells in the matrix.':
    'Make sure you fill in all cells in the matrix.',
  'Switch direction': 'Switch direction',
  'Make circle open': 'Make circle open',
  'Make circle filled': 'Make circle filled',
  'Number of divisions:': 'Number of divisions:',
  'Please make sure the number of divisions is in the range { divRangeString }.':
    'Please make sure the number of divisions is in the range { divRangeString }.',
  'The symbol { questionSymbol } indicates that question { questionNumber } references this portion of the passage.':
    'The symbol { questionSymbol } indicates that question { questionNumber } references this portion of the passage.',
  ' The symbol { sentenceSymbol } indicates that the following sentence is referenced in a question.':
    ' The symbol { sentenceSymbol } indicates that the following sentence is referenced in a question.',
  'Beginning of reading passage.': 'Beginning of reading passage.',
  'Beginning of reading passage footnotes.': 'Beginning of reading passage footnotes.',
  'End of reading passage.': 'End of reading passage.',
  'line { lineNumber }': 'line { lineNumber }',
  'lines { lineRange }': 'lines { lineRange }',
  'Run simulation': 'Run simulation',
  Translate: {
    message: 'Translate',
    context:
      'In geometry, a translation is a geometric transformation that moves every point of a figure or a space by the same distance in a given direction.\n\nSee https://en.wikipedia.org/wiki/Translation_(geometry)',
  },
  Translation: {
    message: 'Translation',
    context:
      'In geometry, a translation is a geometric transformation that moves every point of a figure or a space by the same distance in a given direction.\n\nSee https://en.wikipedia.org/wiki/Translation_(geometry)',
  },
  translation: {
    message: 'translation',
    context:
      'In geometry, a translation is a geometric transformation that moves every point of a figure or a space by the same distance in a given direction.\n\nSee https://en.wikipedia.org/wiki/Translation_(geometry)',
  },
  'Translation by { vector }': 'Translation by { vector }',
  Rotate: {
    message: 'Rotate',
    context: 'A mathematical term.\n\nSee https://en.wikipedia.org/wiki/Rotation_(mathematics)',
  },
  Rotation: {
    message: 'Rotation',
    context: 'A mathematical term.\n\nSee https://en.wikipedia.org/wiki/Rotation_(mathematics)',
  },
  rotation: {
    message: 'rotation',
    context:
      'Rotation in mathematics is a concept originating in geometry. Any rotation is a motion of a certain space that preserves at least one point.\n\nSee https://en.wikipedia.org/wiki/Rotation_(mathematics)',
  },
  'Rotation by { degrees } about { point }': 'Rotation by { degrees } about { point }',
  'Rotation about { point } by { degrees }': 'Rotation about { point } by { degrees }',
  Reflect: {
    message: 'Reflect',
    context:
      'In mathematics, a reflection is a mapping from a Euclidean space to itself that is an isometry with a hyperplane as a set of fixed points.\n\nSee https://en.wikipedia.org/wiki/Reflection_(mathematics).',
  },
  Reflection: {
    message: 'Reflection',
    context:
      'In mathematics, a reflection is a mapping from a Euclidean space to itself that is an isometry with a hyperplane as a set of fixed points. \n\nSee https://en.wikipedia.org/wiki/Reflection_(mathematics).',
  },
  reflection: {
    message: 'reflection',
    context:
      'In mathematics, a reflection is a mapping from a Euclidean space to itself that is an isometry with a hyperplane as a set of fixed points. \n\nSee https://en.wikipedia.org/wiki/Reflection_(mathematics).',
  },
  'Reflection over the line from { point1 } to { point2 }':
    'Reflection over the line from { point1 } to { point2 }',
  Dilate: {
    message: 'Dilate',
    context: 'A mathematical term.\n\nSee https://en.wikipedia.org/wiki/Dilation_(metric_space)',
  },
  Dilation: {
    message: 'Dilation',
    context: 'A mathematical term.\n\nSee https://en.wikipedia.org/wiki/Dilation_(metric_space)',
  },
  dilation: {
    message: 'dilation',
    context: 'A mathematical term.\n\nSee https://en.wikipedia.org/wiki/Dilation_(metric_space)',
  },
  'Dilation of scale { scale } about { point }': 'Dilation of scale { scale } about { point }',
  'Dilation about { point } by { scale }': 'Dilation about { point } by { scale }',
  Undo: 'Undo',
  'Your transformation must use a { type }.': 'Your transformation must use a { type }.',
  'Use the interactive graph to define a correct transformation.':
    'Use the interactive graph to define a correct transformation.',
  "I don't understand that": "I don't understand that",
  "I couldn't understand those units.": "I couldn't understand those units.",
  'Check your significant figures.': 'Check your significant figures.',
  'That answer is numerically incorrect.': 'That answer is numerically incorrect.',
  'Check your units.': 'Check your units.',
  'Your answer is almost correct, but it is missing a <code>%</code> at the end.':
    'Your answer is almost correct, but it is missing a <code>\\\\%</code> at the end.',
  'Your answer is almost correct, but it needs to be simplified.':
    'Your answer is almost correct, but it needs to be simplified.',
  'Your answer is close, but you may have approximated pi. Enter your answer as a multiple of pi, like <code>12 text{pi}</code> or <code>2/3 text{pi}</code>':
    'Your answer is close, but you may have approximated pi. Enter your answer as a multiple of pi, like <code>12\\\\ \\\\text{pi}</code> or <code>2/3\\\\ \\\\text{pi}</code>',
  'We could not understand your answer. Please check your answer for extra text or symbols.':
    'We could not understand your answer. Please check your answer for extra text or symbols.',
  False: 'False',
  True: 'True',
  No: 'No',
  Yes: 'Yes',
  'None of the above': 'None of the above',
  'Please choose the correct number of answers.': 'Please choose the correct number of answers.',
  "'None of the above' may not be selected when other answers are selected.":
    "'None of the above' may not be selected when other answers are selected.",
  'Keep trying': 'Keep trying',
  'Try again': 'Try again',
  'Correct!': 'Correct!',
  '[Marker for question { number }]': '[Marker for question { number }]',
  '[Circle marker { number }]': '[Circle marker { number }]',
  '[Sentence { number }]': '[Sentence { number }]',
  'Math input box': 'Math input box',
  'Choose { numCorrect } answers:': 'Choose { numCorrect } answers:',
  'Choose all answers that apply:': 'Choose all answers that apply:',
  'Choose 1 answer:': 'Choose 1 answer:',
  'Add highlight': 'Add highlight',
  Plus: {
    message: 'Plus',
    context:
      "The plus sign '+' is a mathematical symbol representing the operation of addition, which results in a sum.\n\nSee https://en.wikipedia.org/wiki/Plus_and_minus_signs",
  },
  Minus: {
    message: 'Minus',
    context:
      "The minus sign '-' is a mathematical symbol representing subtraction, resulting in a difference.\n\nSee https://en.wikipedia.org/wiki/Plus_and_minus_signs",
  },
  Negative: {
    message: 'Negative',
    context:
      'In mathematics, a negative number is a number that is less than zero.\n\nSee https://en.wikipedia.org/wiki/Negative_number',
  },
  Multiply: {
    message: 'Multiply',
    context:
      "A multiplication is a mathematical operation denoted by the cross symbol 'x'.\n\nSee https://en.wikipedia.org/wiki/Multiplication",
  },
  Divide: {
    message: 'Divide',
    context:
      "Division is one of the four basic operations of arithmetic. It's represented with the division sign '÷'.\n\nSee https://en.wikipedia.org/wiki/Division_(mathematics).",
  },
  Decimal: {
    message: 'Decimal',
    context:
      'The decimal system is the standard base-ten numeral system. Decimal fractions (sometimes called decimal numbers) are the rational numbers that may be expressed as a fraction whose denominator is a power of ten.\n\nSee https://en.wikipedia.org/wiki/Decimal',
  },
  Percent: {
    message: 'Percent',
    context:
      'In mathematics, percent is a number or ratio expressed as a fraction of 100.\n\nSee https://en.wikipedia.org/wiki/Percentage',
  },
  'Equals sign': 'Equals sign',
  'Not-equals sign': 'Not-equals sign',
  'Greater than sign': 'Greater than sign',
  'Less than sign': 'Less than sign',
  'Greater than or equal to sign': 'Greater than or equal to sign',
  'Less than or equal to sign': 'Less than or equal to sign',
  'Fraction, with current expression in numerator':
    'Fraction, with current expression in numerator',
  'Fraction, excluding the current expression': 'Fraction, excluding the current expression',
  'Custom exponent': 'Custom exponent',
  Square: {
    message: 'Square',
    context:
      'In mathematics, a square is the result of multiplying a number by itself.\n\nSee https://en.wikipedia.org/wiki/Square_(algebra)',
  },
  Cube: {
    message: 'Cube',
    context:
      "In arithmetic and algebra, the cube of a number 'n' is its third power, that is, the result of multiplying three instances of 'n' together. Also used 'to the power of three'.\n\nSee https://en.wikipedia.org/wiki/Cube_(algebra)",
  },
  'Square root': 'Square root',
  'Cube root': 'Cube root',
  'Radical with custom root': 'Radical with custom root',
  'Left parenthesis': 'Left parenthesis',
  'Right parenthesis': 'Right parenthesis',
  'Natural logarithm': 'Natural logarithm',
  'Logarithm with base 10': 'Logarithm with base 10',
  'Logarithm with custom base': 'Logarithm with custom base',
  Sine: {
    message: 'Sine',
    context:
      'In mathematics, the sine is a trigonometric function of an angle.\n\nSee https://en.wikipedia.org/wiki/Sine',
  },
  Cosine: {
    message: 'Cosine',
    context:
      'In mathematics a cosine is a trigonometric function. The trigonometric functions most widely used in modern mathematics are the sine, the cosine, and the tangent.\n\nSee https://en.wikipedia.org/wiki/Trigonometric_functions',
  },
  Tangent: {
    message: 'Tangent',
    context: 'A mathematical term.\n\nSee https://en.wikipedia.org/wiki/Tangent',
  },
  Pi: {
    message: 'Pi',
    context:
      "The number Pi (or 'π') is a mathematical constant. It is defined as the ratio of a circle's circumference to its diameter.\n\nSee https://en.wikipedia.org/wiki/Pi",
  },
  Theta: {
    message: 'Theta',
    context:
      'Theta is the eighth letter of the Greek alphabet denoted by θ.\n\nSee https://en.wikipedia.org/wiki/Theta',
  },
  'Up arrow': 'Up arrow',
  'Right arrow': 'Right arrow',
  'Down arrow': 'Down arrow',
  'Left arrow': 'Left arrow',
  'Navigate right out of a set of parentheses': 'Navigate right out of a set of parentheses',
  'Navigate right out of an exponent': 'Navigate right out of an exponent',
  'Navigate right out of a base': 'Navigate right out of a base',
  'Navigate right into the numerator of a fraction':
    'Navigate right into the numerator of a fraction',
  'Navigate right out of the numerator and into the denominator':
    'Navigate right out of the numerator and into the denominator',
  'Navigate right out of the denominator of a fraction':
    'Navigate right out of the denominator of a fraction',
  Delete: {
    message: 'Delete',
    context: 'To delete means to eliminate or erase.',
  },
  Dismiss: {
    message: 'Dismiss',
    context: 'Dismiss here means to either cancel or close some option.',
  },
  'Remove highlight': 'Remove highlight',
  '(Choice { letter }, Checked, Correct)': '(Choice { letter }, Checked, Correct)',
  '(Choice { letter }, Checked, Incorrect)': '(Choice { letter }, Checked, Incorrect)',
  '(Choice { letter }, Checked)': '(Choice { letter }, Checked)',
  '(Choice { letter }, Correct Answer)': '(Choice { letter }, Correct Answer)',
  '(Choice { letter })': '(Choice { letter })',
  'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z':
    'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
  correct: 'correct',
  incorrect: 'incorrect',
  '(selected)': '(selected)',
});

export default translator;
