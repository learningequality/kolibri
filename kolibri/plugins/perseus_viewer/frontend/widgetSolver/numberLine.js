import clamp from 'lodash/clamp';
import range from 'lodash/range';

function startNumDivisions({ range: [rangeMin, rangeMax], numDivisions, tickStep }) {
  return numDivisions ?? (tickStep ? (rangeMax - rangeMin) / tickStep : 10);
}

function onTick({ range: [rangeMin, rangeMax], correctX }, numDivisions) {
  const ticksToCorrectX = ((correctX - rangeMin) * numDivisions) / (rangeMax - rangeMin);
  return Math.abs(ticksToCorrectX - Math.round(ticksToCorrectX)) < 1e-9;
}

function divisionsShowing(rubric) {
  const numDivisions = startNumDivisions(rubric);
  if (!rubric.isTickCtrl) {
    return numDivisions;
  }
  const [minDivisions, maxDivisions] = rubric.divisionRange;
  const clamped = clamp(numDivisions, minDivisions, maxDivisions);
  if (rubric.correctX == null || (clamped === numDivisions && onTick(rubric, numDivisions))) {
    return clamped;
  }
  return (
    range(minDivisions, maxDivisions + 1).find(divisions => onTick(rubric, divisions)) ??
    maxDivisions
  );
}

export default rubric => ({
  rel: rubric.correctRel || 'eq',
  isInequality: rubric.isInequality || false,
  numLinePosition: rubric.correctX ?? rubric.range[0],
  numDivisions: divisionsShowing(rubric),
});
