import Sortable from 'sortablejs';
import { onMounted, onBeforeUnmount, provide, watch } from 'vue';
import { injectDraggableUniverse, createDraggableUniverse } from './useDraggableUniverse';
import { DISABLED_CLASS, PLACED_CLASS } from './classDefinitions';
import { removeNode, insertNodeAt } from './domUtils';
import { dragSortStrings } from './dragSortStrings';

// Default `clone` transform: a copy that is a distinct object but keeps every field
// of the original, identifiers included. Consumers whose clones need independent
// identities pass their own transform.
const shallowClone = original => ({ ...original });

/**
 * Wire up the SortableJS instance and reconciliation for one region. Call from the
 * `setup()` of DraggableRegion.
 * @param {object} props - the DraggableRegion props (reactive)
 * @param {(event: string, ...args: unknown[]) => void} emit - the component's emit
 * @param {() => HTMLElement} getRootEl - returns the region's root element; called once
 * the component is mounted, since the region renders its consumer's element rather than
 * one of its own
 * @returns {{ handleStart: Function, handleEnd: Function, canAccept: Function }} the
 * drag lifecycle callbacks, exposed for unit tests
 */
export default function useDraggableRegion(props, emit, getRootEl) {
  // Regions grouped for cross-region drops share a <DraggableUniverse>
  const universe = injectDraggableUniverse() || createDraggableUniverse();

  const { currentOrder$, itemMovedToRegion$ } = dragSortStrings;

  let sortable = null;

  let rootEl = null;

  // frame handle for the deferred focus-exit announcement, null when none is queued
  let pendingAnnouncement = null;

  // used only for the full-order announcement when focus leaves the region.
  const registeredItems = {};

  // This region's API, registered with the universe so a *source* region can hand
  // this region an item on a cross-region drop.
  const regionApi = {
    get items() {
      return props.items;
    },
    get label() {
      return props.label;
    },
    insertAt(item, index) {
      const next = [...props.items];
      next.splice(index, 0, item);
      emit('update:items', next);
    },
  };

  function reordered(list, fromIndex, toIndex) {
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  function addBounce(node) {
    node.classList.add(PLACED_CLASS);
    node.addEventListener('animationend', () => node.classList.remove(PLACED_CLASS), {
      once: true,
    });
  }

  function handleStart(evt) {
    universe.isDragging.value = true;
    universe.activeRegion.value = regionApi;
    universe.draggedItem.value = props.items[evt.oldDraggableIndex];
    emit('dragstart');
  }

  function handleEnd(evt) {
    universe.isDragging.value = false;
    universe.activeRegion.value = null;
    universe.draggedItem.value = null;
    emit('dragend');

    const { item, clone, from, to, oldIndex, oldDraggableIndex, newDraggableIndex, pullMode } = evt;

    // exit early if the item was dropped back in its original position
    if (from === to && oldDraggableIndex === newDraggableIndex) {
      return;
    }

    // 1. Undo SortableJS's DOM mutation
    removeNode(item);
    if (clone && clone.parentNode) {
      removeNode(clone);
    }
    insertNodeAt(from, item, oldIndex);

    // 2. Apply the change to our sorable data.
    if (to === from) {
      emit('update:items', reordered(props.items, oldDraggableIndex, newDraggableIndex));
      addBounce(item);
      return;
    }

    const target = universe.getRegion(to);
    if (!target) {
      // Dropped outside this universe
      return;
    }
    const movedItem = props.items[oldDraggableIndex];
    if (pullMode === 'clone') {
      // a copy, so the two regions never share a reference to the same item
      target.insertAt(cloneItem(movedItem), newDraggableIndex);
    } else {
      target.insertAt(movedItem, newDraggableIndex);
      emit(
        'update:items',
        props.items.filter((_, i) => i !== oldDraggableIndex),
      );
    }
    if (target.label) {
      universe.sendPoliteMessage(itemMovedToRegion$({ region: target.label }));
    }
  }

  function canAccept() {
    if (props.disabled) {
      return false;
    }
    if (props.capacity != null && props.items.length >= props.capacity) {
      return false;
    }
    return props.accepts(universe.draggedItem.value, universe.activeRegion.value);
  }

  function cloneItem(original) {
    return typeof props.clone === 'function' ? props.clone(original) : shallowClone(original);
  }

  function groupOption() {
    return {
      name: universe.groupName,
      pull: props.clone ? 'clone' : true,
      // a closure, so capacity/disabled/accepts are re-read on every drop check
      put: canAccept,
    };
  }

  // SortableJS copies its options at construction, so anything reactive has to be
  // pushed into the instance when it changes (see the watchers below).
  function updateOption(name, value) {
    if (sortable) {
      sortable.option(name, value);
    }
  }

  watch(
    () => props.sortable,
    sort => updateOption('sort', sort),
  );
  // on the pull mode rather than on `clone` itself, so an inline transform function
  // being a new identity on each render does not churn the instance
  watch(
    () => Boolean(props.clone),
    () => updateOption('group', groupOption()),
  );
  watch(universe.delay, delay => updateOption('delay', delay));

  function announceOrder() {
    const entries = Object.values(registeredItems);
    if (!entries.length) {
      return;
    }
    const order = entries
      .sort((a, b) => a.position - b.position)
      .map((entry, index) => `${index + 1}. ${entry.label}`)
      .join(', ');
    universe.sendPoliteMessage(currentOrder$({ order }));
  }

  function handleFocusOut(event) {
    // window/tab blur: relatedTarget is null but focus hasn't actually left
    if (!document.hasFocus()) {
      return;
    }
    // focus moved to another row inside this region: not a list-exit, don't announce
    if (event.relatedTarget && rootEl.contains(event.relatedTarget)) {
      return;
    }
    // A keyboard move re-renders the region, which detaches the moved row and blurs
    // the move button with a null relatedTarget before focus is restored to it. Wait
    // a frame and look at where focus actually settled, so a move does not get
    // reported as a list-exit — and so the order we read is the post-move one.
    cancelPendingAnnouncement();
    pendingAnnouncement = requestAnimationFrame(() => {
      pendingAnnouncement = null;
      if (!rootEl || !document.hasFocus() || rootEl.contains(document.activeElement)) {
        return;
      }
      announceOrder();
    });
  }

  function cancelPendingAnnouncement() {
    if (pendingAnnouncement !== null) {
      cancelAnimationFrame(pendingAnnouncement);
      pendingAnnouncement = null;
    }
  }

  // Provided for the a11y move buttons
  provide('registerSortItem', (uid, label, position) => {
    registeredItems[uid] = { label, position };
  });
  provide('unregisterSortItem', uid => {
    delete registeredItems[uid];
  });

  onMounted(() => {
    rootEl = getRootEl();
    universe.registerRegion(rootEl, regionApi);
    rootEl.addEventListener('focusout', handleFocusOut);

    sortable = new Sortable(rootEl, {
      ...universe.sortableDefaults,
      delay: universe.delay.value,
      sort: props.sortable,
      filter: `.${DISABLED_CLASS}`,
      group: groupOption(),
      onStart: handleStart,
      onEnd: handleEnd,
    });
  });

  onBeforeUnmount(() => {
    cancelPendingAnnouncement();
    if (sortable) {
      sortable.destroy();
      sortable = null;
    }
    if (rootEl) {
      rootEl.removeEventListener('focusout', handleFocusOut);
      universe.unregisterRegion(rootEl);
      rootEl = null;
    }
  });

  // Exposed for unit tests
  return { handleStart, handleEnd, canAccept };
}
