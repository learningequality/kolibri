export default (widget, rubric) => {
  widget.props.handleUserInput({
    markers: rubric.markers.map(({ label, answers }) => ({ label, selected: answers })),
  });
};
