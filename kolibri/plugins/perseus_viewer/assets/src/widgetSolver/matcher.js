export default (widget, rubric) => {
  const leftComponent = widget.refs.left;
  const leftProps = Object.assign({}, leftComponent.props, {
    options: rubric.left,
  });
  leftComponent.setState({ items: leftComponent.itemsFromProps(leftProps) });

  const rightComponent = widget.refs.right;
  const rightProps = Object.assign({}, rightComponent.props, {
    options: rubric.right,
  });
  rightComponent.setState({ items: rightComponent.itemsFromProps(rightProps) });
};
