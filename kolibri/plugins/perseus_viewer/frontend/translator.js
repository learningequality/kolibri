import { createTranslator } from 'kolibri/utils/i18n';

export default createTranslator('PerseusInternalMessages', {
  characterCount:
    '{used, plural, one {{ used } / { num } Character} other {{ used } / { num } Characters}}',
  closeKeypad: 'close math keypad',
  openKeypad: 'open math keypad',
  mathInputBox: 'Math input box',
  removeHighlight: 'Remove highlight',
  addHighlight: 'Add highlight',
  hintPos: 'Hint #{ pos }',
  errorRendering: 'Error rendering: { error }',
  APPROXIMATED_PI_ERROR:
    'Your answer is close, but you may have approximated pi. Enter your answer as a multiple of pi, like 12 pi or 2/3 pi',
  EMPTY_RESPONSE_ERROR: 'There are still more parts of this question to answer.',
  EXTRA_SYMBOLS_ERROR:
    'We could not understand your answer. Please check your answer for extra text or symbols.',
  NEEDS_TO_BE_SIMPLFIED_ERROR: 'Your answer is almost correct, but it needs to be simplified.',
  MISSING_PERCENT_ERROR:
    'Your answer is almost correct, but it is missing a <code>\\\\\\\\%</code> at the end.',
  MULTIPLICATION_SIGN_ERROR: {
    message:
      "I'm a computer. I only understand multiplication if you use an asterisk (*) as the multiplication sign.",
    context:
      'Feel free to skip translating the first sentence, just make clear the necessity to use the asterisk (*) as the multiplication sign.',
  },
  USER_INPUT_EMPTY: 'Your answer is empty.',
  USER_INPUT_TOO_LONG: 'Please shorten your response.',
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
  INVALID_CHOICE_SELECTION: 'Invalid choice selection',
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
  mixedExample: 'a mixed number, like $1\\\\\\\\ 3/4$',
  decimalExample: 'an *exact* decimal, like $0.75$',
  percentExample: 'a percent, like $12.34\\\\\\\\%$',
  piExample: 'a multiple of pi, like $12$ pi or $2/3$ pi',
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
  choiceCorrect: '(Choice { letter }, Correct)',
  choiceCheckedIncorrect: '(Choice { letter }, Checked, Incorrect)',
  choiceIncorrect: '(Choice { letter }, Incorrect)',
  choiceChecked: '(Choice { letter }, Checked)',
  choice: '(Choice { letter })',
  notSelected: {
    message: 'not selected',
    context: 'Screen reader announcement for a choice that is not selected',
  },
  choicesSelected: '{num, plural, one {{ num } choice selected} other {{ num } choices selected}}',
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
  scrollAnswers: 'Scroll Answers',
  scrollStart: 'Scroll to view start of the content',
  scrollEnd: 'Scroll to view the end of the content',
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
  pythonProgram: 'Python program',
  computerScienceProgram: 'Computer science program',
  embeddedContent: 'Embedded content',
  mathInputTitle: 'mathematics keyboard',
  mathInputDescription: 'Use keyboard/mouse to interact with math-based input fields',
  sin: {
    message: 'sin',
    context:
      'A label for a button that will allow the user to input a sine function (shorthand version).',
  },
  cos: {
    message: 'cos',
    context:
      'A label for a button that will allow the user to input a cosine function (shorthand version).',
  },
  tan: {
    message: 'tan',
    context:
      'A label for a button that will allow the user to input a tangent function (shorthand version).',
  },
  simulationLoadFail: 'Sorry, this simulation cannot load.',
  simulationLocaleWarning: "Sorry, this simulation isn't available in your language.",
  selectAnAnswer: 'Select an answer',
  addPoint: 'Add Point',
  removePoint: 'Remove Point',
  graphKeyboardPrompt: 'Press Shift + Enter to interact with the graph',
  ungradedInteractiveGraph:
    'Use this graph to check your thinking, but it does not count as your answer.',
  srInteractiveElements: 'Interactive elements: { elements }',
  srNoInteractiveElements: 'No interactive elements',
  closePolygon: {
    message: 'Close shape',
    context:
      'Button label for the button that closes an incomplete polygon created by the user in the interactive graph widget.',
  },
  openPolygon: {
    message: 'Re-open shape',
    context:
      'Button label for the button that opens a closed polygon created by the user in the interactive graph widget.',
  },
  srGraphInstructions: {
    message:
      'Use the Tab key to move through the interactive elements in the graph. When an interactive element has focus, use Control + Shift + Arrows to move it.',
    context:
      'Screen reader-only instructions for using the keyboard to move through the interactive elements in the interactive graph widget.',
  },
  srUnlimitedGraphInstructions: {
    message:
      'Press Shift + Enter to interact with the graph. Use the Tab key to move through the interactive elements in the graph and access the graph Action Bar. When an interactive element has focus, use Control + Shift + Arrows to move it or use the Delete key to remove it from the graph. Use the buttons in the Action Bar to add or adjust elements within the graph.',
    context:
      "Screen reader-only instructions for using the keyboard to move through the 'unlimited' (addable/deletable by the user) interactive elements in the interactive graph widget.",
  },
  srPointAtCoordinates: {
    message: 'Point { num } at { x } comma { y }.',
    context:
      "Aria label for an interactive Point element in the interactive graph widget, including the count for its order in the points (e.g. 'Point 1 at 0 comma 0'). Coordinate (x, y) is written out as 'x comma y'.",
  },
  srCircleGraph: {
    message: 'A circle on a coordinate plane.',
    context:
      'Aria label for the container containing the Circle and its interactive elements in the interactive graph widget.',
  },
  srCircleShape: {
    message: 'Circle. The center point is at { centerX } comma { centerY }.',
    context: 'Aria label for the interactive Circle element in the interactive graph widget.',
  },
  srCircleRadiusPointRight: {
    message: 'Right radius endpoint at { radiusPointX } comma { radiusPointY }.',
    context:
      "Aria label for the interactive Point element that represents the radius endpoint when it's on the right side of the Circle in the interactive graph widget.",
  },
  srCircleRadiusPointLeft: {
    message: 'Left radius endpoint at { radiusPointX } comma { radiusPointY }.',
    context:
      "Aria label for the interactive Point element that represents the radius endpoint when it's on the left side of the Circle in the interactive graph widget.",
  },
  srCircleRadius: {
    message: 'Circle radius is { radius }.',
    context:
      'Screen reader description for the radius of the Circle in the interactive graph widget.',
  },
  srCircleOuterPoints: {
    message:
      'Points on the circle at { point1X } comma { point1Y }, { point2X } comma { point2Y }, { point3X } comma { point3Y }, { point4X } comma { point4Y }.',
    context:
      'Screen reader description for four key points on the Circle in the interactive graph widget.',
  },
  srLinearGraph: {
    message: 'A line on a coordinate plane.',
    context:
      'Aria label for the container containing the Line and its interactive elements in the interactive graph widget.',
  },
  srLinearGraphPoints: {
    message:
      'The line has two points, point 1 at { point1X } comma { point1Y } and point 2 at { point2X } comma { point2Y }.',
    context:
      'Screen reader description for the two points defining the Line in the interactive graph widget.',
  },
  srLinearGraphSlopeIncreasing: {
    message: 'Its slope increases from left to right.',
    context:
      'Screen reader description for the upward slope of the Line in the interactive graph widget.',
  },
  srLinearGraphSlopeDecreasing: {
    message: 'Its slope decreases from left to right.',
    context:
      'Screen reader description for the downward slope of the Line in the interactive graph widget.',
  },
  srLinearGraphSlopeHorizontal: {
    message: 'Its slope is zero.',
    context:
      'Screen reader description for the slope of a horizontal Line in the interactive graph widget.',
  },
  srLinearGraphSlopeVertical: {
    message: 'Its slope is undefined.',
    context:
      'Screen reader description for the slope of a vertical Line in the interactive graph widget.',
  },
  srLinearGraphXOnlyIntercept: {
    message: 'The line crosses the X-axis at { xIntercept } comma 0.',
    context:
      'Screen reader description for the intercept of the Line in the interactive graph widget when it only intersects the X-axis.',
  },
  srLinearGraphYOnlyIntercept: {
    message: 'The line crosses the Y-axis at 0 comma { yIntercept }.',
    context:
      'Screen reader description for the intercept of the Line in the interactive graph widget when it only intersects the Y-axis.',
  },
  srLinearGraphBothIntercepts: {
    message:
      'The line crosses the X-axis at { xIntercept } comma 0 and the Y-axis at 0 comma { yIntercept }.',
    context:
      'Screen reader description for the intercepts of the Line in the interactive graph widget when it intersects both the X-axis and Y-axis.',
  },
  srLinearGraphOriginIntercept: {
    message: "The line crosses the X and Y axes at the graph's origin.",
    context:
      'Screen reader description for the intercept of the Line in the interactive graph widget when it intersects both the X-axis and Y-axis at the origin.',
  },
  srLinearGrabHandle: {
    message:
      'Line going through point { point1X } comma { point1Y } and point { point2X } comma { point2Y }.',
    context:
      'Aria label for the interactive segment that allows the user to move the whole Line in the interactive graph widget.',
  },
  srAngleStartingSide: {
    message: 'Point 3, starting side at { x } comma { y }.',
    context:
      "Aria label for interactive Point 3 of the Angle in the interactive graph widget, explaining it's on the starting side of the Angle.",
  },
  srAngleEndingSide: {
    message: 'Point 2, ending side at { x } comma { y }.',
    context:
      "Aria label for interactive Point 2 of the Angle in the interactive graph widget, explaining it's on the ending side of the Angle.",
  },
  srAngleVertexWithAngleMeasure: {
    message: 'Point 1, vertex at { x } comma { y }. Angle { angleMeasure } degrees.',
    context:
      "Aria label for interactive Point 1 of the Angle in the interactive graph widget, explaining it's the vertex of the Angle.",
  },
  srAngleGraphAriaLabel: {
    message: 'An angle on a coordinate plane.',
    context:
      'Aria label for the container containing the Angle and its interactive elements in the interactive graph widget.',
  },
  srAngleGraphAriaDescription: {
    message:
      'The angle measure is { angleMeasure } degrees with a vertex at { vertexX } comma { vertexY }, a point on the starting side at { startingSideX } comma { startingSideY } and a point on the ending side at { endingSideX } comma { endingSideY }',
    context:
      'Screen reader description for the measure of the Angle in the interactive graph widget.',
  },
  srAngleInteractiveElements: {
    message:
      'An angle formed by 3 points. The vertex is at { vertexX } comma { vertexY }. The starting side point is at { startingSideX } comma { startingSideY }. The ending side point is at { endingSideX } comma { endingSideY }.',
    context:
      'Screen reader description of all the elements available to interact with within the Angle graph in the interactive graph widget.',
  },
  srSingleSegmentGraphAriaLabel: {
    message: 'A line segment on a coordinate plane.',
    context:
      'Aria label for the container containing one Line Segment in the interactive graph widget.',
  },
  srMultipleSegmentGraphAriaLabel: {
    message: '{ countOfSegments } line segments on a coordinate plane.',
    context:
      'Aria label for the container containing multiple Line Segments in the interactive graph widget.',
  },
  srMultipleSegmentIndividualLabel: {
    message:
      'Segment { indexOfSegment }: Endpoint 1 at { point1X } comma { point1Y }. Endpoint 2 at { point2X } comma { point2Y }.',
    context:
      "Screen reader description for one individual Line Segment in the interactive graph widget, including the count for its order in the segments (e.g. 'Segment 1', 'Segment 2', etc.)",
  },
  srSingleSegmentLabel: {
    message:
      'Endpoint 1 at { point1X } comma { point1Y }. Endpoint 2 at { point2X } comma { point2Y }.',
    context:
      'Screen reader description for one individual Line Segment in the interactive graph widget.',
  },
  srSegmentLength: {
    message: 'Segment length { length } units.',
    context:
      'Screen reader description for the length of a Line Segment in the interactive graph widget.',
  },
  srSingleSegmentGraphEndpointAriaLabel: {
    message: 'Endpoint { endpointNumber } at { x } comma { y }.',
    context:
      'Screen reader description for the endpoint of a Line Segment in the interactive graph widget when there is only one segment.',
  },
  srMultipleSegmentGraphEndpointAriaLabel: {
    message: 'Endpoint { endpointNumber } on segment { indexOfSegment } at { x } comma { y }.',
    context:
      "Screen reader description for the endpoint of a Line Segment in the interactive graph widget when there are multiple segments. Includes the count for the segment's order (e.g. 'Segment 1', 'Segment 2', etc.)",
  },
  srSegmentGrabHandle: {
    message: 'Segment from { point1X } comma { point1Y } to { point2X } comma { point2Y }.',
    context:
      'Aria label for the interactive segment that allows the user to move the whole Line Segment in the interactive graph widget.',
  },
  srLinearSystemGraph: {
    message: 'Two lines on a coordinate plane.',
    context:
      'Aria label for the container containing two lines as part of a Linear System in the interactive graph widget.',
  },
  srLinearSystemPoints: {
    message:
      'Line { lineNumber } has two points, point 1 at { point1X } comma { point1Y } and point 2 at { point2X } comma { point2Y }.',
    context:
      'Screen reader description for the points of a line in the Linear System in the interactive graph widget.',
  },
  srLinearSystemPoint: {
    message: 'Point { pointSequence } on line { lineNumber } at { x } comma { y }.',
    context:
      'Screen reader description for a point on a line in the Linear System in the interactive graph widget.',
  },
  srLinearSystemGrabHandle: {
    message:
      'Line { lineNumber } going through point { point1X } comma { point1Y } and point { point2X } comma { point2Y }.',
    context:
      'Aria label for the interactive segment that allows the user to move a whole line in the Linear System in the interactive graph widget.',
  },
  srLinearSystemIntersection: {
    message: 'Line 1 and line 2 intersect at point { x } comma { y }.',
    context:
      'Screen reader description for the intersection of two lines in the Linear System in the interactive graph widget.',
  },
  srLinearSystemParallel: {
    message: 'Line 1 and line 2 are parallel.',
    context:
      'Screen reader description when two lines are parallel in the Linear System in the interactive graph widget.',
  },
  srRayGraph: {
    message: 'A ray on a coordinate plane.',
    context:
      'Screen reader description for the container containing a Ray in the interactive graph widget.',
  },
  srRayPoints: {
    message:
      'The endpoint is at { point1X } comma { point1Y } and the ray goes through point { point2X } comma { point2Y }.',
    context: 'Screen reader description for the points of a ray in the interactive graph widget.',
  },
  srRayGrabHandle: {
    message:
      'Ray with endpoint { point1X } comma { point1Y } going through point { point2X } comma { point2Y }.',
    context:
      'Aria label for the interactive segment that allows the user to move the whole Ray in the interactive graph widget.',
  },
  srRayEndpoint: {
    message: 'Endpoint at { x } comma { y }.',
    context:
      'Aria label for the initial point of a Ray (the point at which the ray starts) in the interactive graph widget.',
  },
  srRayTerminalPoint: {
    message: 'Through point at { x } comma { y }.',
    context:
      'Aria label for the point that determines the direction of the Ray in the interactive graph widget. The ray passes through this point.',
  },
  srVectorGraph: {
    message: 'A vector on a coordinate plane.',
    context:
      'Screen reader description for the container containing a Vector in the interactive graph widget.',
  },
  srVectorPoints: {
    message: 'The tail is at { tailX } comma { tailY } and the tip is at { tipX } comma { tipY }.',
    context:
      'Screen reader description for the tail and tip of a vector in the interactive graph widget.',
  },
  srVectorTipPoint: {
    message: 'Tip point at { x } comma { y }.',
    context:
      'Aria label for the tip point of a Vector (the point with the arrowhead) in the interactive graph widget.',
  },
  srVectorGrabHandle: {
    message: 'Vector from { tailX } comma { tailY } to { tipX } comma { tipY }.',
    context:
      'Aria label for the interactive segment that allows the user to move the whole Vector in the interactive graph widget.',
  },
  srQuadraticGraph: {
    message: 'A parabola on a 4-quadrant coordinate plane.',
    context:
      'Aria label for the container containing a Quadratic function in the interactive graph widget.',
  },
  srQuadraticFaceUp: {
    message: 'The parabola opens upward.',
    context:
      'Screen reader description for the direction of the Quadratic function in the interactive graph widget when it opens upward.',
  },
  srQuadraticFaceDown: {
    message: 'The parabola opens downward.',
    context:
      'Screen reader description for the direction of the Quadratic function in the interactive graph widget when it opens downward.',
  },
  srQuadraticGraphVertexOrigin: {
    message: 'Vertex is at the origin.',
    context:
      'Screen reader description for the Quadratic function in the interactive graph widget when its vertex is at the origin.',
  },
  srQuadraticGraphVertexXAxis: {
    message: 'Vertex is on the X-axis.',
    context:
      'Screen reader description for the Quadratic function in the interactive graph widget when its vertex is on the X-axis.',
  },
  srQuadraticGraphVertexYAxis: {
    message: 'Vertex is on the Y-axis.',
    context:
      'Screen reader description for the Quadratic function in the interactive graph widget when its vertex is on the Y-axis.',
  },
  srQuadraticGraphVertexQuadrant: {
    message: 'Vertex is in quadrant { quadrant }.',
    context:
      'Screen reader description for the Quadratic function in the interactive graph widget when its vertex is in a specific quadrant (quadrant 1, 2, 3, or 4).',
  },
  srQuadraticTwoXIntercepts: {
    message: 'The X-intercepts are at { intercept1 } comma 0 and { intercept2 } comma 0.',
    context:
      'Screen reader description for the X-intercepts of the Quadratic function in the interactive graph widget when there are two X-intercepts.',
  },
  srQuadraticOneXIntercept: {
    message: 'The X-intercept is at { intercept } comma 0.',
    context:
      'Screen reader description for the X-intercept of the Quadratic function in the interactive graph widget when there is only one X-intercept.',
  },
  srQuadraticYIntercept: {
    message: 'The Y-intercept is at 0 comma { intercept }.',
    context:
      'Screen reader description for the Y-intercept of the Quadratic function in the interactive graph widget.',
  },
  srQuadraticPointOrigin: {
    message: 'Point { pointNumber } on parabola at the origin.',
    context:
      'Aria label for an interactive Point on the Quadratic function in the interactive graph widget when the Point is at the origin.',
  },
  srQuadraticPointAxis: {
    message: 'Point { pointNumber } on parabola at { x } comma { y }.',
    context:
      'Aria label for an interactive Point on the Quadratic function in the interactive graph widget when the Point is on the X-axis or Y-axis.',
  },
  srQuadraticPointQuadrant: {
    message: 'Point { pointNumber } on parabola in quadrant { quadrant } at { x } comma { y }.',
    context:
      'Aria label for an interactive Point on the Quadratic function in the interactive graph widget when the Point is in a specific quadrant.',
  },
  srQuadraticInteractiveElements: {
    message:
      'Parabola with points at { point1X } comma { point1Y }, { point2X } comma { point2Y }, and { point3X } comma { point3Y }.',
    context:
      'Screen reader description of all the elements available to interact with within the Quadratic function in the interactive graph widget.',
  },
  srPolygonGraph: {
    message: 'A polygon.',
    context:
      "Aria label for the container containing a Polygon in the interactive graph widget when it's on a plane/grid without axes.",
  },
  srPolygonGraphCoordinatePlane: {
    message: 'A polygon on a coordinate plane.',
    context:
      "Aria label for the container containing a Polygon in the interactive graph widget when it's on a coordinate plane.",
  },
  srPolygonGraphPointsNum: {
    message: 'The polygon has { num } points.',
    context:
      'Screen reader description for the number of points in the Polygon in the interactive graph widget.',
  },
  srPolygonGraphPointsOne: {
    message: 'The polygon has 1 point.',
    context:
      'Screen reader description for the number of points in the Polygon in the interactive graph widget when there is only one point.',
  },
  srPolygonElementsNum: {
    message: 'A polygon with { num } points.',
    context:
      'Screen reader description for the Polygon in the interactive graph widget explaining that it has a certain number of points.',
  },
  srPolygonElementsOne: {
    message: 'A polygon with 1 point.',
    context:
      'Screen reader description for the Polygon in the interactive graph widget explaining that it has one point.',
  },
  srPolygonPointAngleApprox: {
    message: 'Angle approximately equal to { angle } degrees.',
    context:
      "Screen reader description for the angle of a point in the Polygon in the interactive graph widget when it's not an exact integer.",
  },
  srPolygonPointAngle: {
    message: 'Angle equal to { angle } degrees.',
    context:
      "Screen reader description for the angle of a point in the Polygon in the interactive graph widget when it's an integer.",
  },
  srPolygonSideLength: {
    message: 'A line segment, length equal to { length } units, connects to point { pointNum }.',
    context:
      'Screen reader description for the side of the Polygon in the interactive graph widget when its length is an exact integer.',
  },
  srPolygonSideLengthApprox: {
    message:
      'A line segment, length approximately equal to { length } units, connects to point { pointNum }.',
    context:
      'Screen reader description for the side of the Polygon in the interactive graph widget when its length is not an exact integer.',
  },
  srUnlimitedPolygonEmpty: {
    message: 'An empty coordinate plane.',
    context:
      'Screen reader description for the empty container that will eventually contain a Polygon in the interactive graph widget after the user has added points.',
  },
  srSinusoidGraph: {
    message: 'A sinusoid function on a coordinate plane.',
    context:
      'Aria label for the container containing a Sinusoid function in the interactive graph widget.',
  },
  srSinusoidRootPoint: {
    message: 'Midline intersection at { x } comma { y }.',
    context:
      'Aria label for the Point defining the midline intersection of the Sinusoid function in the interactive graph widget.',
  },
  srSinusoidMaxPoint: {
    message: 'Maximum point at { x } comma { y }.',
    context:
      'Aria label for the Point defining the maximum of the Sinusoid function in the interactive graph widget.',
  },
  srSinusoidMinPoint: {
    message: 'Minimum point at { x } comma { y }.',
    context:
      'Aria label for the Point defining the minimum of the Sinusoid function in the interactive graph widget.',
  },
  srSinusoidFlatPoint: {
    message: 'Line through point at { x } comma { y }.',
    context:
      'Aria label for the Point defining the amplitude of the Sinusoid function in the interactive graph widget when the amplitude is 0.',
  },
  srSinusoidDescription: {
    message:
      'The graph shows a wave with a minimum value of { minValue } and a maximum value of { maxValue }. The wave completes a full cycle from { cycleStart } to { cycleEnd }.',
    context: 'Screen reader description of the Sinusoid function in the interactive graph widget.',
  },
  srSinusoidInteractiveElements: {
    message:
      'Sinusoid graph with midline intersection point at { point1X } comma { point1Y } and extremum point at { point2X } comma { point2Y }.',
    context:
      'Screen reader description of all the elements available to interact with within the Sinusoid function in the interactive graph widget.',
  },
  srExponentialGraph: {
    message: 'An exponential curve on a coordinate plane.',
    context:
      'Aria label for the container containing an Exponential function in the interactive graph widget.',
  },
  srExponentialPoint1: {
    message: 'Point 1 at { x } comma { y }.',
    context:
      'Aria label for the first Point on the Exponential function in the interactive graph widget.',
  },
  srExponentialPoint2: {
    message: 'Point 2 at { x } comma { y }.',
    context:
      'Aria label for the second Point on the Exponential function in the interactive graph widget.',
  },
  srExponentialDescription: {
    message:
      'The graph shows an exponential curve passing through point { point1X } comma { point1Y } and point { point2X } comma { point2Y } with a horizontal asymptote at y equals { asymptoteY }.',
    context:
      'Screen reader description of the Exponential function in the interactive graph widget.',
  },
  srExponentialInteractiveElements: {
    message:
      'Exponential graph with point 1 at { point1X } comma { point1Y }, point 2 at { point2X } comma { point2Y }, and horizontal asymptote at y equals { asymptoteY }.',
    context:
      'Screen reader description of all the elements available to interact with within the Exponential function in the interactive graph widget.',
  },
  srExponentialAsymptote: {
    message: 'Horizontal asymptote at y equals { asymptoteY }. Use up and down arrow keys to move.',
    context:
      'Aria label for the draggable horizontal asymptote line in the Exponential function in the interactive graph widget.',
  },
  srLogarithmGraph: {
    message: 'A logarithm function on a coordinate plane.',
    context:
      'Aria label for the container containing a Logarithm function in the interactive graph widget.',
  },
  srLogarithmPoint1: {
    message: 'Point 1 at { x } comma { y }.',
    context:
      'Aria label for the first Point on the Logarithm function in the interactive graph widget.',
  },
  srLogarithmPoint2: {
    message: 'Point 2 at { x } comma { y }.',
    context:
      'Aria label for the second Point on the Logarithm function in the interactive graph widget.',
  },
  srLogarithmDescription: {
    message:
      'The graph shows a logarithm curve passing through point { point1X } comma { point1Y } and point { point2X } comma { point2Y } with a vertical asymptote at x equals { asymptoteX }.',
    context: 'Screen reader description of the Logarithm function in the interactive graph widget.',
  },
  srLogarithmInteractiveElements: {
    message:
      'Logarithm graph with point 1 at { point1X } comma { point1Y }, point 2 at { point2X } comma { point2Y }, and vertical asymptote at x equals { asymptoteX }.',
    context:
      'Screen reader description of all the elements available to interact with within the Logarithm function in the interactive graph widget.',
  },
  srLogarithmAsymptote: {
    message:
      'Vertical asymptote at x equals { asymptoteX }. Use left and right arrow keys to move.',
    context:
      'Aria label for the draggable vertical asymptote line in the Logarithm function in the interactive graph widget.',
  },
  srAbsoluteValueGraph: {
    message: 'An absolute value function on a coordinate plane.',
    context:
      'Aria label for the container containing an Absolute Value function in the interactive graph widget.',
  },
  srAbsoluteValueVertexPoint: {
    message: 'Vertex point at { x } comma { y }.',
    context:
      'Aria label for the Point defining the vertex of the Absolute Value function in the interactive graph widget.',
  },
  srAbsoluteValueSecondPoint: {
    message: 'Point on arm at { x } comma { y }.',
    context:
      'Aria label for the second Point defining the slope of the Absolute Value function in the interactive graph widget.',
  },
  srAbsoluteValueDescription: {
    message:
      'The graph shows an absolute value function with vertex at { x } comma { y } and slope { slope }.',
    context:
      'Screen reader description of the Absolute Value function in the interactive graph widget.',
  },
  srAbsoluteValueInteractiveElements: {
    message:
      'Absolute value graph with vertex point at { point1X } comma { point1Y } and arm point at { point2X } comma { point2Y }.',
    context:
      'Screen reader description of all the elements available to interact with within the Absolute Value function in the interactive graph widget.',
  },
  srTangentGraph: {
    message: 'A tangent function on a coordinate plane.',
    context:
      'Aria label for the container containing a Tangent function in the interactive graph widget.',
  },
  srTangentInflectionPoint: {
    message: 'Inflection point at { x } comma { y }.',
    context:
      'Aria label for the Point defining the inflection point of the Tangent function in the interactive graph widget.',
  },
  srTangentSecondPoint: {
    message: 'Control point at { x } comma { y }.',
    context:
      'Aria label for the second control point of the Tangent function in the interactive graph widget.',
  },
  srTangentDescription: {
    message:
      'The graph shows a tangent function with an inflection point at { inflectionX } comma { inflectionY }.',
    context: 'Screen reader description of the Tangent function in the interactive graph widget.',
  },
  srTangentInteractiveElements: {
    message:
      'Tangent graph with inflection point at { point1X } comma { point1Y } and control point at { point2X } comma { point2Y }.',
    context:
      'Screen reader description of all the elements available to interact with within the Tangent function in the interactive graph widget.',
  },
  imageExploreButton: 'Explore image',
  imageExploreButtonAriaLabel: 'Explore image and description',
  imageAlternativeTitle: 'Explore image and description',
  imageDescriptionLabel: 'Description',
  imageZoomAriaLabel: 'Make image bigger.',
  imageResetZoomAriaLabel: 'Close image.',
  gifPlayButtonLabel: 'Play Animation',
  gifPauseButtonLabel: 'Pause Animation',
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
