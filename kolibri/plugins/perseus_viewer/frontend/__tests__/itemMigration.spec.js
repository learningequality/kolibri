import {
  generateExplanationOptions,
  generateExplanationWidget,
  generateGradedGroupOptions,
  generateGradedGroupSetWidget,
  generateGradedGroupWidget,
  generateMeasurerWidget,
  generateNumberLineOptions,
  generateNumberLineWidget,
  generateRadioWidget,
  isFailure,
  parseAndMigratePerseusItem,
} from '@khanacademy/perseus-core';
import { migrateItem } from '../itemMigration';
import { migrated, rawItem, renderer } from '../testUtils/makeItem';

function numberLine(labelStyle) {
  return generateNumberLineWidget({
    options: generateNumberLineOptions({ labelStyle, labelTicks: false, correctX: 1 }),
  });
}

describe('migrateItem', () => {
  it('migrates a "decimal ticks" number line to decimal labels on every tick', () => {
    const item = migrated(rawItem({ 'number-line 1': numberLine('decimal ticks') }));

    expect(item.question.widgets['number-line 1'].options).toMatchObject({
      labelStyle: 'decimal',
      labelTicks: true,
    });
  });

  it('migrates a "decimal ticks" number line inside a hint', () => {
    const item = migrated(
      rawItem({ 'radio 1': generateRadioWidget() }, [
        renderer({ 'number-line 1': numberLine('decimal ticks') }),
      ]),
    );

    expect(item.hints[0].widgets['number-line 1'].options).toMatchObject({
      labelStyle: 'decimal',
      labelTicks: true,
    });
  });

  function gradedGroupSet(widgets, extraOptions = {}) {
    return generateGradedGroupSetWidget({
      options: {
        gradedGroups: [generateGradedGroupOptions({ ...renderer(widgets), ...extraOptions })],
      },
    });
  }

  function explanation(widgets) {
    const { content, widgets: explanationWidgets } = renderer(widgets);
    return generateExplanationWidget({
      options: generateExplanationOptions({ explanation: content, widgets: explanationWidgets }),
    });
  }

  it('migrates a "decimal ticks" number line inside a graded group set', () => {
    const item = migrated(
      rawItem({
        'graded-group-set 1': gradedGroupSet({ 'number-line 1': numberLine('decimal ticks') }),
      }),
    );

    const [group] = item.question.widgets['graded-group-set 1'].options.gradedGroups;
    expect(group.widgets['number-line 1'].options).toMatchObject({
      labelStyle: 'decimal',
      labelTicks: true,
    });
  });

  it('migrates a "decimal ticks" number line inside a graded group hint', () => {
    const hint = renderer({ 'number-line 1': numberLine('decimal ticks') });
    const item = migrated(
      rawItem({
        'graded-group 1': generateGradedGroupWidget({
          options: generateGradedGroupOptions({ ...renderer({}), hint }),
        }),
      }),
    );

    expect(
      item.question.widgets['graded-group 1'].options.hint.widgets['number-line 1'].options,
    ).toMatchObject({ labelStyle: 'decimal', labelTicks: true });
  });

  it('migrates a "decimal ticks" number line inside a graded group set hint', () => {
    const hint = renderer({ 'number-line 1': numberLine('decimal ticks') });
    const item = migrated(
      rawItem({
        'graded-group-set 1': gradedGroupSet({}, { hint }),
      }),
    );

    const [group] = item.question.widgets['graded-group-set 1'].options.gradedGroups;
    expect(group.hint.widgets['number-line 1'].options).toMatchObject({
      labelStyle: 'decimal',
      labelTicks: true,
    });
  });

  it('migrates a "decimal ticks" number line inside an explanation', () => {
    const item = migrated(
      rawItem({ 'explanation 1': explanation({ 'number-line 1': numberLine('decimal ticks') }) }),
    );

    expect(
      item.question.widgets['explanation 1'].options.widgets['number-line 1'].options,
    ).toMatchObject({
      labelStyle: 'decimal',
      labelTicks: true,
    });
  });

  it('migrates the widgets that parse when another widget in the item does not', () => {
    const result = migrateItem(
      rawItem({
        'input-number 1': {
          type: 'input-number',
          version: { major: 0, minor: 0 },
          options: { value: 0.5, simplify: 'required', size: 'normal', answerType: 'number' },
        },
        'measurer 1': generateMeasurerWidget(),
      }),
    );

    expect(isFailure(result)).toBe(true);
    expect(result.value.question.widgets['input-number 1'].options.answers).toEqual([
      expect.objectContaining({ status: 'correct', value: 0.5, simplify: 'required' }),
    ]);
    expect(result.value.question.widgets['measurer 1']).toEqual(generateMeasurerWidget());
  });

  it.each([
    [
      'cs-program',
      { programID: '123', settings: [], showEditor: false, showButtons: false, height: 400 },
    ],
    ['python-program', { programID: '123', height: 400 }],
  ])('migrates a %s item to a deprecated standin', (type, options) => {
    const { question } = rawItem({ [`${type} 1`]: { type, options } });
    const result = migrateItem({ question });

    expect(isFailure(result)).toBe(false);
    expect(result.value.question.widgets[`${type} 1`].type).toBe('deprecated-standin');
    expect(result.value.answerArea).toBeDefined();
    expect(result.value.hints).toEqual([]);
  });

  it.each([
    ['no simplify', {}],
    ['a boolean simplify', { simplify: true }],
  ])('requires simplifying a legacy input-number with %s', (_, simplifyOption) => {
    const item = migrated(
      rawItem({
        'input-number 1': {
          type: 'input-number',
          options: { value: 0.5, size: 'normal', answerType: 'number', ...simplifyOption },
        },
      }),
    );

    expect(item.question.widgets['input-number 1'].options.answers).toEqual([
      expect.objectContaining({ simplify: 'required' }),
    ]);
  });

  it('returns other items as Perseus migrates them', () => {
    const itemData = rawItem({
      'radio 1': generateRadioWidget(),
      'number-line 1': numberLine('decimal'),
    });

    expect(migrateItem(itemData)).toEqual(parseAndMigratePerseusItem(itemData));
  });
});
