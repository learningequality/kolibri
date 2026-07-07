import { createTranslator } from 'kolibri/utils/i18n';

export const dragSortStrings = createTranslator('DragSortStrings', {
  moveItemUpLabel: {
    message: 'Move {item} up',
    context: 'Button label to move a specific item up in a vertical reorderable list',
  },
  moveItemDownLabel: {
    message: 'Move {item} down',
    context: 'Button label to move a specific item down in a vertical reorderable list',
  },
  moveItemLeftLabel: {
    message: 'Move {item} left',
    context: 'Button label to move a specific item left in a horizontal reorderable list',
  },
  moveItemRightLabel: {
    message: 'Move {item} right',
    context: 'Button label to move a specific item right in a horizontal reorderable list',
  },
  itemMovedToPosition: {
    message: '{item} moved to position {position, number} of {total, number}',
    context: 'Live region announcement after moving an item in a reorderable list',
  },
  currentOrder: {
    message: 'Current order: {order}',
    context:
      'Live region announcement of the full list order after focus leaves the reorderable list',
  },
});
