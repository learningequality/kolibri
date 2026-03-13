import { Fraction } from 'fractional';

export default (widget, rubric) => {
  const userInput = {
    rel: rubric.isInequality ? rubric.rel || 'ge' : 'eq',
    isInequality: rubric.isInequality || false,
    numLinePosition: rubric.correctX || rubric.range[0],
    numDivisions: rubric.numDivisions || 10,
  };

  if (rubric.correctX) {
    const correctX = rubric.correctX;
    const rangeMin = rubric.range[0];
    const rangeMax = rubric.range[1];

    const numDivisions = new Fraction(correctX - rangeMin, rangeMax - rangeMin).denominator;
    userInput.numLinePosition = correctX;
    userInput.numDivisions = Math.min(numDivisions, widget.props.divisionRange[1]);
  }

  if (rubric.rel) {
    userInput.rel = rubric.rel;
  }

  widget.props.handleUserInput(userInput);
};
