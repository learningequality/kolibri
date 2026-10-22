import {
  isFailure,
  isSuccess,
  parseAndMigratePerseusItem,
  parseAndMigratePerseusRenderer,
  traverse,
} from '@khanacademy/perseus-core';

function mapHint(gradedGroup, widgetCallback) {
  if (!gradedGroup.hint) {
    return gradedGroup;
  }
  return { ...gradedGroup, hint: mapWidgets(gradedGroup.hint, widgetCallback) };
}

// perseus-core's traverse does not descend into graded-group hints, graded-group-set groups
// or explanation widgets.
function mapNestedWidgets(widgetInfo, widgetCallback) {
  const { type, options } = widgetInfo;
  if (type === 'graded-group' && options) {
    return { ...widgetInfo, options: mapHint(options, widgetCallback) };
  }
  if (type === 'graded-group-set' && options?.gradedGroups) {
    const gradedGroups = options.gradedGroups.map(group =>
      mapHint(mapWidgets(group, widgetCallback), widgetCallback),
    );
    return { ...widgetInfo, options: { ...options, gradedGroups } };
  }
  if (type === 'explanation' && options?.widgets) {
    const { widgets } = mapWidgets(
      { content: options.explanation, widgets: options.widgets },
      widgetCallback,
    );
    return { ...widgetInfo, options: { ...options, widgets } };
  }
  return widgetInfo;
}

function mapWidgets(renderer, widgetCallback) {
  return traverse(renderer, null, (widgetInfo, widgetId) => {
    const mapped = mapNestedWidgets(widgetInfo, widgetCallback);
    return widgetCallback(mapped, widgetId) || mapped;
  });
}

function mapItemWidgets(item, widgetCallback) {
  const mapRenderer = renderer => renderer && mapWidgets(renderer, widgetCallback);
  return {
    ...item,
    question: mapRenderer(item.question),
    ...(item.hints && { hints: item.hints.map(mapRenderer) }),
  };
}

// Perseus 78's number line drew decimal labels on every tick for "decimal ticks";
// perseus-core 39 rejects that labelStyle.
function migrateDecimalTicks(widgetInfo) {
  if (widgetInfo.type === 'number-line' && widgetInfo.options?.labelStyle === 'decimal ticks') {
    return {
      ...widgetInfo,
      options: { ...widgetInfo.options, labelStyle: 'decimal', labelTicks: true },
    };
  }
}

const SIMPLIFY_VALUES = ['required', 'optional', 'enforced'];
const ANSWER_TYPES = [
  'number',
  'decimal',
  'integer',
  'rational',
  'improper',
  'mixed',
  'percent',
  'pi',
];
const BOOLEAN_OPTIONS = ['inexact', 'rightAlign'];
const WIDGET_FIELD_TYPES = {
  static: 'boolean',
  graded: 'boolean',
  alignment: 'string',
  key: 'number',
};

function isValidOption(key, value) {
  if (key === 'answerType') {
    return ANSWER_TYPES.includes(value);
  }
  if (key === 'maxError') {
    return ['number', 'string'].includes(typeof value);
  }
  return value !== null;
}

// perseus-core 39 rejects these v0 input-number shapes, which Perseus 78 scored anyway:
// perseus-score 8.11.7 treated an unknown `simplify` as required, and Perseus 78 read
// `inexact`/`rightAlign` by truthiness.
function fillInputNumberDefaults(widgetInfo) {
  const { type, version, options } = widgetInfo;
  if (type === 'input-number' && !version?.major && options) {
    const widgetFields = Object.entries(WIDGET_FIELD_TYPES).filter(
      ([key, fieldType]) => typeof widgetInfo[key] === fieldType,
    );
    const validOptions = Object.entries(options)
      .filter(([key, value]) => isValidOption(key, value))
      .map(([key, value]) => [key, BOOLEAN_OPTIONS.includes(key) ? Boolean(value) : value]);
    return {
      type,
      ...Object.fromEntries(widgetFields.map(([key]) => [key, widgetInfo[key]])),
      version: { major: 0, minor: 0 },
      options: {
        ...Object.fromEntries(validOptions),
        size: options.size === 'small' ? 'small' : 'normal',
        simplify: SIMPLIFY_VALUES.includes(options.simplify) ? options.simplify : 'required',
      },
    };
  }
}

function prepareWidget(widgetInfo) {
  return migrateDecimalTicks(widgetInfo) || fillInputNumberDefaults(widgetInfo);
}

function migrateWidget(widgetInfo, widgetId) {
  const result = parseAndMigratePerseusRenderer({
    content: '',
    images: {},
    widgets: { [widgetId]: widgetInfo },
  });
  const migrated = isSuccess(result) ? result.value.widgets[widgetId] : widgetInfo;
  return retireKhanAcademyEmbed(migrated) || migrated;
}

/**
 * On parse failure, `value` is still set, holding every widget that parses on its own in
 * migrated form and the rest as given.
 * @param {object} itemData - Perseus item data as published in the channel.
 * @returns {object} perseus-core's parse result.
 */
export function migrateItem(itemData) {
  const prepared = mapItemWidgets(itemData, prepareWidget);
  const result = parseAndMigratePerseusItem(prepared);
  if (isFailure(result)) {
    return { ...result, value: mapItemWidgets(prepared, migrateWidget) };
  }
  return { ...result, value: mapItemWidgets(result.value, retireKhanAcademyEmbed) };
}
