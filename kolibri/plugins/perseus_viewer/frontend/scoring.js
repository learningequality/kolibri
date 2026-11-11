import {
  flattenScores,
  getWidgetValidator,
  isWidgetScoreable,
  scoreWidgetsFunctional,
} from '@khanacademy/perseus-score';
import { getWidgetIdsFromContent } from '@khanacademy/perseus-core';
import { isReadNumericResponse } from './numericResponses';

function scoreWidgets(widgets, widgetIds, userInput, language) {
  const scoreableIds = widgetIds.filter(id => isWidgetScoreable(widgets[id]));
  const groupIds = scoreableIds.filter(id => widgets[id].type === 'group');
  const otherIds = scoreableIds.filter(id => widgets[id].type !== 'group');
  const isRead = id => isReadNumericResponse(widgets, id, userInput[id]);
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

// Mirrors perseus-score 8.12.26's `scorePerseusItem` and `scoreGroup`, without `widgetScores`.
// Both pass one locale to every widget, group children included.
export function scoreItem(question, userInput, language) {
  return flattenScores(
    scoreWidgets(question.widgets, getWidgetIdsFromContent(question.content), userInput, language),
  );
}
