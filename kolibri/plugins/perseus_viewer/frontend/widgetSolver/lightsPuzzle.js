export default widget => {
  const cells = widget.props.cells.map(row => {
    return row.map(() => {
      return true;
    });
  });

  widget.props.onChange(
    {
      cells,
    },
    null, // cb
    false, // silent
  );
};
