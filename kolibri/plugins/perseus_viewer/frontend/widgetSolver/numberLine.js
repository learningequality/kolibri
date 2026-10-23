import { Fraction } from 'fractional';

function divisionsShowing(rubric) {
  const [rangeMin, rangeMax] = rubric.range;
  const [minDivisions, maxDivisions] = rubric.divisionRange;
  const numDivisions = rubric.numDivisions || 10;
  const ticksToCorrectX = ((rubric.correctX - rangeMin) * numDivisions) / (rangeMax - rangeMin);
  if (Math.abs(ticksToCorrectX - Math.round(ticksToCorrectX)) < 1e-9) {
    return numDivisions;
  }
  const denominator = new Fraction(rubric.correctX - rangeMin, rangeMax - rangeMin).denominator;
  return Math.min(Math.max(1, Math.ceil(minDivisions / denominator)) * denominator, maxDivisions);
}

export default rubric => {
  const userInput = {
    rel: rubric.correctRel || 'eq',
    isInequality: rubric.isInequality || false,
    numLinePosition: rubric.range[0],
    numDivisions: rubric.numDivisions || 10,
  };

  if (rubric.correctX != null) {
    userInput.numLinePosition = rubric.correctX;
    userInput.numDivisions = divisionsShowing(rubric);
  }

  return userInput;
};
