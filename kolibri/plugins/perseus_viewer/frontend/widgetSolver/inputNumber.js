import numericInput from './numericInput';

export default rubric => numericInput(rubric, rubric.answers[0].simplify === 'required');
