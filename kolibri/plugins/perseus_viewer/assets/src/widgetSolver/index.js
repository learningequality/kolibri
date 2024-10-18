import logger from 'kolibri-logging';
import categorizer from './categorizer';
import dropdown from './dropdown';
import expression from './expression';
import grapher from './grapher';
import inputNumber from './inputNumber';
import interactiveGraph from './interactiveGraph';
import lightsPuzzle from './lightsPuzzle';
import matcher from './matcher';
import matrix from './matrix';
import noop from './noop';
import numberLine from './numberLine';
import numericInput from './numericInput';
import orderer from './orderer';
import plotter from './plotter';
import radio from './radio';
import sorter from './sorter';
import table from './table';
import transformer from './transformer';
import unit from './unit';

const logging = logger.getLogger(__filename);

const widgetSolvers = {
  categorizer,
  dropdown,
  explanation: noop,
  expression,
  grapher,
  image: noop,
  'input-number': inputNumber,
  'interactive-graph': interactiveGraph,
  'lights-puzzle': lightsPuzzle,
  matcher,
  matrix,
  measurer: noop,
  'number-line': numberLine,
  'numeric-input': numericInput,
  orderer,
  passage: noop,
  plotter,
  radio,
  sorter,
  table,
  transformer,
  unit,
};

export default (widget, type, rubric) => {
  if (!widgetSolvers[type]) {
    throw new ReferenceError(`No solver available for widget type: ${type}`);
  }
  try {
    widgetSolvers[type](widget, rubric);
    const blurWidget = widget.blurInputPath;
    // Call blurWidget with an empty path
    blurWidget && blurWidget('');
  } catch (e) {
    logging.debug('An error occurred while solving a problem', e);
  }
};
