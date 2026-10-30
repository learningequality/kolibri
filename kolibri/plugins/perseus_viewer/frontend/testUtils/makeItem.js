import { isFailure } from '@khanacademy/perseus-core';
import { migrateItem } from '../itemMigration';

export function renderer(widgets) {
  return {
    content: Object.keys(widgets)
      .map(id => `[[☃ ${id}]]`)
      .join(' '),
    images: {},
    widgets,
  };
}

export function rawItem(widgets, hints = []) {
  return {
    question: renderer(widgets),
    answerArea: {},
    hints,
    itemDataVersion: { major: 0, minor: 1 },
  };
}

export function migrated(itemData) {
  const result = migrateItem(itemData);
  if (isFailure(result)) {
    throw new Error('Failed to migrate item: ' + result.detail.message);
  }
  return result.value;
}

export default function makeItem(widgets) {
  return migrated(rawItem(widgets));
}
