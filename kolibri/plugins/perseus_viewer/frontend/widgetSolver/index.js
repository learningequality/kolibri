import { getWidgetIdsFromContent } from '@khanacademy/perseus-core';
import { isWidgetScoreable } from '@khanacademy/perseus-score';
import categorizer from './categorizer';
import dropdown from './dropdown';
import expression from './expression';
import grapher from './grapher';
import inputNumber from './inputNumber';
import interactiveGraph from './interactiveGraph';
import labelImage from './labelImage';
import matcher from './matcher';
import matrix from './matrix';
import numberLine from './numberLine';
import numericInput from './numericInput';
import orderer from './orderer';
import plotter from './plotter';
import radio from './radio';
import sorter from './sorter';
import table from './table';

const widgetSolvers = {
  categorizer,
  'deprecated-standin': () => ({}),
  dropdown,
  expression,
  grapher,
  group: solveWidgets,
  'input-number': inputNumber,
  'interactive-graph': interactiveGraph,
  'label-image': labelImage,
  matcher,
  matrix,
  'number-line': numberLine,
  'numeric-input': numericInput,
  orderer,
  plotter,
  radio,
  sorter,
  table,
};

function widgetSolver(type, rubric) {
  if (!widgetSolvers[type]) {
    throw new ReferenceError(`No solver available for widget type: ${type}`);
  }
  return widgetSolvers[type](rubric);
}

function solveWidgets({ content, widgets }) {
  return Object.fromEntries(
    getWidgetIdsFromContent(content)
      .filter(id => isWidgetScoreable(widgets[id]))
      .map(id => [id, widgetSolver(widgets[id].type, widgets[id].options)]),
  );
}

export default widgetSolver;
