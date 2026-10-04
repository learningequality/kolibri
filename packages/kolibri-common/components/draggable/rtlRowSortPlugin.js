import Sortable from 'sortablejs';

/**
 * SortableJS places a dragged item in a row by comparing the pointer with item rects
 * as if the row ran left to right. In a right-to-left row, an item dragged over its
 * neighbours jumps to the end of the list (the far left) and stays there.
 *
 * This plugin takes over placement while an item is dragged within its own RTL row:
 * the item goes after the item under the pointer once the pointer is past that item's
 * middle toward the end of the row, and before it otherwise. Everything else, LTR rows
 * and vertical lists included, is left to SortableJS.
 */
function RtlRowSort() {
  // registered on every SortableJS instance; dragOverValid decides when to act
  this.defaults = { [RtlRowSort.pluginName]: true };
}

RtlRowSort.pluginName = 'rtlRowSort';

// The visible item next to `item` in the given direction, skipping the mirror that
// follows the pointer and any hidden clone, as SortableJS does.
function neighbourItem(item, { draggable }, mirror, forward) {
  let sibling = item;
  do {
    sibling = forward ? sibling.nextElementSibling : sibling.previousElementSibling;
  } while (
    sibling &&
    (sibling === mirror || sibling.style.display === 'none' || !sibling.matches(draggable))
  );
  return sibling;
}

// Moves the dragged item beside the item under the pointer, if it isn't there
// already. Returns whether it moved.
function placeBesideTarget({ sortable, dragEl, ghostEl, target, originalEvent, onMove, changed }) {
  const list = sortable.el;
  // over the list but not over another item: leave the item where it is
  if (target.parentNode !== list) {
    return false;
  }
  const { left, width } = target.getBoundingClientRect();
  // the end of an RTL row is to the left
  const after = originalEvent.clientX < left + width / 2;
  const alreadyPlaced = neighbourItem(dragEl, sortable.options, ghostEl, !after) === target;
  if (alreadyPlaced || onMove(target, after) === false) {
    return false;
  }
  sortable.captureAnimationState();
  list.insertBefore(dragEl, after ? target.nextSibling : target);
  changed();
  return true;
}

RtlRowSort.prototype = {
  dragOverValid(evt) {
    const { sortable, dragEl, axis, completed, cancel } = evt;
    if (
      axis !== 'horizontal' ||
      dragEl.parentNode !== sortable.el ||
      window.getComputedStyle(sortable.el).direction !== 'rtl'
    ) {
      return;
    }
    completed(placeBesideTarget(evt));
    // last: completed() fires a plugin event of its own, which clears the flag
    cancel();
  },
};

Sortable.mount(RtlRowSort);
