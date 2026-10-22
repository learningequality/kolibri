export default rubric => ({
  answers: rubric.answers.map(row =>
    row.map(cell => (typeof cell === 'number' ? cell.toString() : '')),
  ),
});
