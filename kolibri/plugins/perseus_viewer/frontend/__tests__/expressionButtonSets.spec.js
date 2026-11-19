import expressionButtonSets from '../expressionButtonSets';

function expression(buttonSets) {
  return { type: 'expression', options: { answerForms: [], buttonSets } };
}

describe('expressionButtonSets', () => {
  it("collects every expression widget's button sets once", () => {
    const widgets = {
      'expression 1': expression(['basic', 'trig']),
      'expression 2': expression(['basic', 'logarithms']),
    };
    expect(expressionButtonSets(widgets).sort()).toEqual(['basic', 'logarithms', 'trig']);
  });

  it('collects button sets from expression widgets inside graded groups', () => {
    const widgets = {
      'graded-group 1': {
        type: 'graded-group',
        options: { widgets: { 'expression 1': expression(['trig']) } },
      },
    };
    expect(expressionButtonSets(widgets)).toEqual(['trig']);
  });

  it('ignores other widgets', () => {
    const widgets = {
      'numeric-input 1': { type: 'numeric-input', options: { buttonSets: ['trig'] } },
    };
    expect(expressionButtonSets(widgets)).toEqual([]);
  });
});
