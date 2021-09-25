export default (widget, rubric) => {
  const transformations = rubric.correct.transformations;
  widget.setTransformationProps(transformations, () => {
    widget.setTransformations(transformations);
  });
};
