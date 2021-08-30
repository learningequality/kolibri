export default (widget, rubric) => {
  const sortableComponent = widget.refs.sortable;
  const newProps = Object.assign({}, sortableComponent.props, {
    options: rubric.correct,
  });
  sortableComponent.setState({ items: sortableComponent.itemsFromProps(newProps) });
};
