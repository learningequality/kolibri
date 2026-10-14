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

// Whether `el` is a visible list item: not the mirror that follows the pointer, and
// not a hidden clone, as SortableJS counts them.
function isItem(el, { draggable }, mirror) {
  return el !== mirror && el.style.display !== 'none' && el.matches(draggable);
}

// The item next to `item` in the given direction.
function neighbourItem(item, options, mirror, forward) {
  let sibling = item;
  do {
    sibling = forward ? sibling.nextElementSibling : sibling.previousElementSibling;
  } while (sibling && !isItem(sibling, options, mirror));
  return sibling;
}

function lastItem(list, options, mirror) {
  let item = list.lastElementChild;
  while (item && !isItem(item, options, mirror)) {
    item = item.previousElementSibling;
  }
  return item;
}

// Moves the dragged item beside the item under the pointer, if it isn't there
// already. Returns whether it moved.
function placeBesideTarget({ sortable, dragEl, ghostEl, target, originalEvent, onMove, changed }) {
  const list = sortable.el;
  const { clientX, clientY } = originalEvent;
  let anchor = target;
  let after = true;
  if (target.parentNode === list) {
    const { left, width } = target.getBoundingClientRect();
    // the end of an RTL row is to the left
    after = clientX < left + width / 2;
    if (neighbourItem(dragEl, sortable.options, ghostEl, !after) === target) {
      return false;
    }
  } else {
    anchor = lastItem(list, sortable.options, ghostEl);
    const { left, top } = anchor.getBoundingClientRect();
    if (anchor === dragEl || clientX >= left || clientY < top) {
      return false;
    }
  }
  if (onMove(anchor, after) === false) {
    return false;
  }
  sortable.captureAnimationState();
  list.insertBefore(dragEl, after ? anchor.nextSibling : anchor);
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
