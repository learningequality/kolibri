export default widget => {
  // Create a grid with all cells set to true (all lights on)
  const cells = widget.props.cells.map(row => {
    return row.map(() => {
      return true;
    });
  });

  widget.props.handleUserInput({
    cells,
  });
};
