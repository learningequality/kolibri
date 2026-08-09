import Sortable from 'sortablejs';
import { onMounted, onBeforeUnmount, provide } from 'vue';
import { injectDraggableUniverse, createDraggableUniverse } from './useDraggableUniverse';
import { DISABLED_CLASS, PLACED_CLASS } from './classDefinitions';
import { removeNode, insertNodeAt } from './domUtils';
import { dragSortStrings } from './dragSortStrings';

/**
 * Wire up the SortableJS instance and reconciliation for one region. Call from the
 * `setup()` of DraggableRegion.
 * @param {object} props - the DraggableRegion props (reactive)
 * @param {(event: string, ...args: unknown[]) => void} emit - the component's emit
 * @param {import('vue').Ref<HTMLElement>} rootElRef - ref to the region's root element
 * @returns {{ handleStart: Function, handleEnd: Function, canAccept: Function }} the
 * drag lifecycle callbacks, exposed for unit tests
 */
export default function useDraggableRegion(props, emit, rootElRef) {
  // Regions grouped for cross-region drops share a <DraggableUniverse>
  const universe = injectDraggableUniverse() || createDraggableUniverse();

  const { currentOrder$, itemMovedToRegion$ } = dragSortStrings;

  let sortable = null;

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
      if (oldDraggableIndex === newDraggableIndex) {
        return;
      }
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
    target.insertAt(movedItem, newDraggableIndex);
    if (pullMode !== 'clone') {
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

  function handleFocusOut(event) {
    // window/tab blur: relatedTarget is null but focus hasn't actually left
    if (!document.hasFocus()) {
      return;
    }
    // focus moved to another row inside this region: not a list-exit, don't announce
    if (event.relatedTarget && rootElRef.value.contains(event.relatedTarget)) {
      return;
    }
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

  // Provided for the a11y move buttons
  provide('registerSortItem', (uid, label, position) => {
    registeredItems[uid] = { label, position };
  });
  provide('unregisterSortItem', uid => {
    delete registeredItems[uid];
  });

  onMounted(() => {
    const el = rootElRef.value;
    universe.registerRegion(el, regionApi);
    el.addEventListener('focusout', handleFocusOut);

    sortable = new Sortable(el, {
      ...universe.sortableDefaults,
      sort: props.sortable,
      filter: `.${DISABLED_CLASS}`,
      group: {
        name: universe.groupName,
        pull: props.clone ? 'clone' : true,
        put: canAccept,
      },
      onStart: handleStart,
      onEnd: handleEnd,
    });
  });

  onBeforeUnmount(() => {
    const el = rootElRef.value;
    if (sortable) {
      sortable.destroy();
      sortable = null;
    }
    if (el) {
      el.removeEventListener('focusout', handleFocusOut);
      universe.unregisterRegion(el);
    }
  });

  // Exposed for unit tests
  return { handleStart, handleEnd, canAccept };
}
