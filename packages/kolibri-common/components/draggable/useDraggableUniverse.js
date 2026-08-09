import { ref, provide, inject } from 'vue';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import {
  ITEM_CLASS,
  HANDLE_CLASS,
  MIRROR_CLASS,
  GHOST_CLASS,
  CHOSEN_CLASS,
  DRAG_CLASS,
} from './classDefinitions';

const DraggableUniverseSymbol = Symbol('draggableUniverse');

// Backs the generated group name so distinct universes never share a group
let universeCounter = 0;

/**
 * Build a universe context. Kept separate from `provide` so a region with no
 * `<DraggableUniverse>` ancestor can create its own standalone context.
 * @param {object} [options] - universe configuration
 * @param {string} [options.name] - explicit group name; defaults to a unique id.
 * Intentionally initial-value-only: it is read once here, and a universe keeps the
 * group name it was created with for its whole lifetime. Regions cannot be moved
 * between groups after mount.
 * @param {number} [options.delay] - initial press-and-hold delay (ms) before a drag
 * begins; set `delay.value` on the returned context to change it afterwards
 * @returns {object} the universe context
 */
export function createDraggableUniverse({ name, delay } = {}) {
  universeCounter += 1;
  const groupName = name || `draggable-universe-${universeCounter}`;

  // each region's root element -> its API
  const regions = new Map();

  // drag state
  const isDragging = ref(false);
  const activeRegion = ref(null);
  const draggedItem = ref(null);

  const { sendPoliteMessage } = useKLiveRegion();

  // Reactive so a universe can change the press-and-hold delay after its regions
  // have mounted; each region watches this and updates its SortableJS instance.
  const dragDelay = ref(delay == null ? 250 : delay);

  const sortableDefaults = {
    forceFallback: true,
    fallbackOnBody: false, // keep the clone inside the region subtree so overrides still match
    draggable: `.${ITEM_CLASS}`,
    handle: `.${HANDLE_CLASS}`,
    fallbackClass: MIRROR_CLASS,
    ghostClass: GHOST_CLASS,
    chosenClass: CHOSEN_CLASS,
    dragClass: DRAG_CLASS,
    animation: 150,
  };

  return {
    groupName,
    sortableDefaults,
    delay: dragDelay,
    isDragging,
    activeRegion,
    draggedItem,
    sendPoliteMessage,
    registerRegion(el, api) {
      regions.set(el, api);
    },
    unregisterRegion(el) {
      regions.delete(el);
    },
    getRegion(el) {
      return regions.get(el);
    },
  };
}

/**
 * Create a universe context and provide it to descendant regions. Call from the
 * `setup()` of a component that wraps several regions meant to share items.
 * @param {object} [options] - name/delay options, see {@link createDraggableUniverse}
 * @returns {object} the universe context
 */
export default function useDraggableUniverse(options = {}) {
  const context = createDraggableUniverse(options);
  provide(DraggableUniverseSymbol, context);
  return context;
}

/**
 * Inject the nearest universe context, or `null` when a region has no
 * `<DraggableUniverse>` ancestor.
 * @returns {?object} the universe context
 */
export function injectDraggableUniverse() {
  return inject(DraggableUniverseSymbol, null);
}
