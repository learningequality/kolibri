import { isSuccess, parseAndMigrateUserInputMap } from '@khanacademy/perseus-core';
import { parse, traverseContent } from '@khanacademy/pure-markdown';
import fixtures from '../__fixtures__/perseus';

const responseWidgetTypes = new Set([
  'categorizer',
  'cs-program',
  'dropdown',
  'expression',
  'free-response',
  'grapher',
  'group',
  'iframe',
  'input-number',
  'interactive-graph',
  'label-image',
  'matcher',
  'matrix',
  'number-line',
  'numeric-input',
  'orderer',
  'plotter',
  'radio',
  'sorter',
  'table',
]);

function isEditable(widget) {
  return responseWidgetTypes.has(widget?.type) && !widget.static;
}

function createPackageFiles(files) {
  const assets = Object.entries(files).map(([path, data]) => {
    const match = /^data:([^,;]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(data);
    if (!match || match[0] !== data) throw new Error('Invalid base64 asset');
    const [, type, encoded] = match;
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    return [path, new Blob([bytes], { type })];
  });
  return Object.fromEntries(assets.map(([path, blob]) => [path, URL.createObjectURL(blob)]));
}

function validResponse(widget, answer) {
  if (!responseWidgetTypes.has(widget?.type)) return false;
  if (widget.type === 'group') {
    return (
      answer !== null &&
      typeof answer === 'object' &&
      !Array.isArray(answer) &&
      Object.entries(answer).every(([id, value]) =>
        validResponse(widget.options?.widgets?.[id], value),
      )
    );
  }
  if (
    widget.type === 'label-image' &&
    answer?.markers?.length !== widget.options?.markers?.length
  ) {
    return false;
  }
  const choices = widget.type === 'dropdown' && widget.options?.choices;
  if (
    choices &&
    !(Number.isInteger(answer?.value) && answer.value >= 0 && answer.value <= choices.length)
  ) {
    return false;
  }
  return isSuccess(parseAndMigrateUserInputMap({ [`${widget.type} 1`]: answer }));
}

export default {
  id: 'perseus',
  title: 'Perseus',
  preset: 'exercise',
  fixtures,
  createPackageFiles,
  itemData: (fixture, source, packageFiles) => ({
    perseusItemString: source,
    packageFiles,
    sourceId: fixture.id,
    emitProgrammaticInteractions: true,
  }),
  widgetIds: item => {
    const { content, widgets } = item?.question || {};
    const ids = new Set();
    if (typeof content === 'string') {
      const collectWidget = node => {
        if (node.type === 'titledTable') traverseContent(node.title, collectWidget);
        if (node.type === 'widget' && isEditable(widgets?.[node.id])) {
          ids.add(node.id);
        }
      };
      traverseContent(parse(content), collectWidget);
    }
    return [...ids];
  },
  validAnswer: (item, id, answer) => {
    const widget = item?.question?.widgets?.[id];
    return isEditable(widget) && validResponse(widget, answer);
  },
  readAnswers: result => result?.answerState?.userInput || {},
  answerState: userInput => ({ userInput }),
  remountState: (attempt, showAnswer) =>
    showAnswer ? { hintsVisible: attempt.hintsVisible } : attempt,
};
