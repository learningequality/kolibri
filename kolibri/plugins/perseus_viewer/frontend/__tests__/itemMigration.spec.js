import {
  generateExplanationOptions,
  generateExplanationWidget,
  generateGradedGroupOptions,
  generateGradedGroupSetWidget,
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

const MOLECULE = {
  type: 'molecule-renderer',
  graded: true,
  version: { major: 0, minor: 0 },
  options: { smiles: 'CCO', rotationAngle: 30 },
};

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

  it('keeps the molecule type and options of a top-level molecule', () => {
    const item = migrated(rawItem({ 'molecule-renderer 1': MOLECULE }));

    expect(item.question.widgets['molecule-renderer 1']).toMatchObject({
      type: 'molecule-renderer',
      options: { smiles: 'CCO', rotationAngle: 30 },
    });
  });

  it('keeps the molecule type of a molecule inside a group', () => {
    const item = migrated(
      rawItem({
        'group 1': {
          type: 'group',
          graded: true,
          version: { major: 0, minor: 0 },
          options: renderer({ 'molecule-renderer 1': MOLECULE }),
        },
      }),
    );

    expect(item.question.widgets['group 1'].options.widgets['molecule-renderer 1']).toMatchObject({
      type: 'molecule-renderer',
      options: { smiles: 'CCO', rotationAngle: 30 },
    });
  });

  it('keeps the molecule type of a molecule inside a hint', () => {
    const item = migrated(
      rawItem({ 'radio 1': generateRadioWidget() }, [
        renderer({ 'molecule-renderer 1': MOLECULE }),
      ]),
    );

    expect(item.hints[0].widgets['molecule-renderer 1']).toMatchObject({
      type: 'molecule-renderer',
      options: { smiles: 'CCO', rotationAngle: 30 },
    });
  });

  function gradedGroupSet(widgets) {
    return generateGradedGroupSetWidget({
      options: { gradedGroups: [generateGradedGroupOptions(renderer(widgets))] },
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

  it('keeps the molecule type of a molecule inside a graded group set', () => {
    const item = migrated(
      rawItem({ 'graded-group-set 1': gradedGroupSet({ 'molecule-renderer 1': MOLECULE }) }),
    );

    const [group] = item.question.widgets['graded-group-set 1'].options.gradedGroups;
    expect(group.widgets['molecule-renderer 1']).toMatchObject({
      type: 'molecule-renderer',
      options: { smiles: 'CCO', rotationAngle: 30 },
    });
  });

  it('keeps the molecule type of a molecule inside an explanation', () => {
    const item = migrated(
      rawItem({ 'explanation 1': explanation({ 'molecule-renderer 1': MOLECULE }) }),
    );

    expect(
      item.question.widgets['explanation 1'].options.widgets['molecule-renderer 1'],
    ).toMatchObject({
      type: 'molecule-renderer',
      options: { smiles: 'CCO', rotationAngle: 30 },
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

  it('returns other items as Perseus migrates them', () => {
    const itemData = rawItem({
      'radio 1': generateRadioWidget(),
      'number-line 1': numberLine('decimal'),
    });

    expect(migrateItem(itemData)).toEqual(parseAndMigratePerseusItem(itemData));
  });
});
