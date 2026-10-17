import {
  flattenScores,
  getWidgetValidator,
  isWidgetScoreable,
  scoreWidgetsFunctional,
} from '@khanacademy/perseus-score';
import { getWidgetIdsFromContent } from '@khanacademy/perseus-core';
import {
  formatLocaleNumber,
  getLocaleNumberSymbols,
  readLocaleNumber,
} from 'kolibri-common/utils/localeNumbers';
import { localizeUserInput, normalizeUserInput } from 'kolibri-common/utils/numeralNormalization';

const NUMERIC_WIDGET_TYPES = new Set(['numeric-input', 'input-number']);
const PERCENT = '\\%';

function numericText(widgets, id, input) {
  const isNumeric = NUMERIC_WIDGET_TYPES.has(widgets[id]?.type);
  return isNumeric && typeof input?.currentValue === 'string' ? input.currentValue : null;
}

function splitPercent(text) {
  return text.endsWith(PERCENT) ? [text.slice(0, -PERCENT.length), PERCENT] : [text, ''];
}

function readNumber(text, language) {
  const [number, percent] = splitPercent(text);
  const read = readLocaleNumber(number, language);
  return read === null ? null : read + percent;
}

function formatNumber(text, language) {
  const [number, percent] = splitPercent(text);
  return formatLocaleNumber(number, language) + percent;
}

function isGroup(widgets, id, input) {
  return widgets[id]?.type === 'group' && input != null;
}

function mapResponses(userInput, widgets, language, mapResponse) {
  return Object.fromEntries(
    Object.entries(userInput).map(([id, input]) =>
      isGroup(widgets, id, input)
        ? [id, mapResponses(input, widgets[id].options.widgets, language, mapResponse)]
        : [id, mapResponse(widgets, id, input, language)],
    ),
  );
}

function readNumericResponse(widgets, id, input, language) {
  const text = numericText(widgets, id, input);
  return text === null ? input : { ...input, currentValue: readNumber(text, language) ?? text };
}

export function readUserInput(userInput, widgets, language) {
  return normalizeUserInput(mapResponses(userInput, widgets, language, readNumericResponse));
}

function retypeArabicDecimal(shown, language) {
  if (getLocaleNumberSymbols(language).decimal !== '٫') {
    return null;
  }
  const typed = shown.replaceAll('.', '٫');
  return readNumber(typed, language) === null ? typed : null;
}

function canonicalNumericText(widgets, id, input) {
  const text = numericText(widgets, id, input);
  return text !== null && readNumber(text) !== null ? text : null;
}

export function localizeNumericResponses(userInput, widgets, language) {
  return mapResponses(userInput, widgets, language, localizeNumericResponse);
}

function localizeNumericResponse(widgets, id, input, language) {
  const stored = canonicalNumericText(widgets, id, input);
  return stored === null
    ? localizeOtherResponse(widgets, id, input, language)
    : { ...input, currentValue: formatNumber(stored, language) };
}

function localizeOtherResponse(widgets, id, input, language) {
  const localized = localizeUserInput(input, language);
  const shown = numericText(widgets, id, localized);
  const shownNumber = shown === null ? null : readNumber(shown, language);
  if (shownNumber === null) {
    return localized;
  }
  const typed = retypeArabicDecimal(shown, language);
  if (typed !== null) {
    return { ...localized, currentValue: typed };
  }
  return shownNumber === readNumber(input.currentValue, language) ? localized : input;
}

function scoreWidgets(widgets, widgetIds, userInput, language) {
  const scoreableIds = widgetIds.filter(id => isWidgetScoreable(widgets[id]));
  const groupIds = scoreableIds.filter(id => widgets[id].type === 'group');
  const otherIds = scoreableIds.filter(id => widgets[id].type !== 'group');
  const isRead = id => canonicalNumericText(widgets, id, userInput[id]) !== null;
  // Perseus reads `1.234` as 1234 too where the decimal separator is `,`.
  return {
    ...scoreWidgetsFunctional(
      widgets,
      otherIds.filter(id => !isRead(id)),
      userInput,
      language,
    ),
    ...scoreWidgetsFunctional(widgets, otherIds.filter(isRead), userInput, 'en'),
    ...Object.fromEntries(
      groupIds.map(id => [id, scoreGroup(widgets[id].options, userInput[id], language)]),
    ),
  };
}

function scoreGroup(options, userInput, language) {
  return (
    getWidgetValidator('group')?.(userInput, options, language) ??
    flattenScores(scoreWidgets(options.widgets, Object.keys(options.widgets), userInput, language))
  );
}

// Mirrors perseus-score 8.11.7's `scorePerseusItem` and `scoreGroup`, without `widgetScores`.
export function scoreItem(question, userInput, language) {
  return flattenScores(
    scoreWidgets(question.widgets, getWidgetIdsFromContent(question.content), userInput, language),
  );
}
