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
 * @param {string} [options.name] - explicit group name; defaults to a unique id
 * @param {number} [options.delay] - press-and-hold delay (ms) before a drag begins
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

  const { sendPoliteMessage } = useKLiveRegion();

  const sortableDefaults = {
    delay: delay == null ? 250 : delay,
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
    isDragging,
    activeRegion,
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
