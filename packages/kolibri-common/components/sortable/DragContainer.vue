<script>

  // Implemention inspired by an excellent demo at:
  // https://github.com/adamwathan/vue-shopify-sortable-demo

  import Sortable from 'sortablejs';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import {
    SORTABLE_CLASS,
    HANDLE_CLASS,
    MIRROR_CLASS,
    GHOST_CLASS,
    PLACED_CLASS,
  } from './classDefinitions';
  import { dragSortStrings } from './dragSortStrings';

  export default {
    name: 'DragContainer',
    setup() {
      const { sendPoliteMessage } = useKLiveRegion();
      const { currentOrder$ } = dragSortStrings;
      return { sendPoliteMessage, currentOrder$ };
    },
    provide() {
      return {
        registerSortItem: this.registerSortItem,
        unregisterSortItem: this.unregisterSortItem,
      };
    },
    props: {
      items: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        sortable: null,
      };
    },
    created() {
      // doesn't need reactivity tracking.
      this.registeredItems = {};
    },
    mounted() {
      // next tick just to be safe
      this.$nextTick(this.initialize);
    },
    beforeDestroy() {
      this.sortable.destroy();
      this.$el.removeEventListener('focusout', this.handleFocusOut);
    },
    methods: {
      initialize() {
        this.sortable = new Sortable(this.$el, {
          draggable: `.${SORTABLE_CLASS}`,
          handle: `.${HANDLE_CLASS}`,
          delay: 250, // matches the previous 250ms press-delay before a drag begins
          forceFallback: true, // consistent DOM mirror across browsers + reliable touch dragging
          fallbackClass: MIRROR_CLASS, // the clone that follows the pointer
          // Leave fallbackOnBody at its default (false): the clone is appended to the
          // sortable root (this.$el), inside this component's scoped subtree, so the
          // scoped `/deep/ .sortable-item--mirror` styles (here and in
          // LessonResourcesTable) still match. fallbackOnBody: true would move the
          // clone to <body> and break those selectors.
          ghostClass: GHOST_CLASS, // the source left in the list, hidden via CSS during drag
          animation: 150, // reorder animation, replacing Shopify's SwapAnimation plugin
          onStart: this.handleStart,
          onEnd: this.handleStop,
        });

        this.$el.addEventListener('focusout', this.handleFocusOut);
      },
      handleStart() {
        this.$emit('dragStart');
      },
      handleStop(event) {
        const { oldIndex, newIndex, item } = event;
        // Do nothing if the item hasn't been moved
        if (oldIndex === newIndex) {
          return;
        }
        const itemRemovedArray = [
          ...this.items.slice(0, oldIndex),
          ...this.items.slice(oldIndex + 1, this.items.length),
        ];
        const newArray = [
          ...itemRemovedArray.slice(0, newIndex),
          this.items[oldIndex],
          ...itemRemovedArray.slice(newIndex, itemRemovedArray.length),
        ];
        this.$emit('sort', { newArray, oldIndex, newIndex });

        // Hand-rolled drop "bounce" — SortableJS has no --placed equivalent.
        // The moved DOM node persists across Vue's re-render because callsites key
        // their items stably, so the animation lands on the settled element.
        item.classList.add(PLACED_CLASS);
        item.addEventListener('animationend', () => item.classList.remove(PLACED_CLASS), {
          once: true,
        });
      },
      registerSortItem(uid, label, position) {
        this.registeredItems[uid] = { label, position };
      },
      unregisterSortItem(uid) {
        delete this.registeredItems[uid];
      },
      handleFocusOut(event) {
        // window/tab blur: relatedTarget is null but focus hasn't actually left
        if (!document.hasFocus()) {
          return;
        }
        // focus moved to another row inside this container: not a list-exit, don't announce
        if (event.relatedTarget && this.$el.contains(event.relatedTarget)) {
          return;
        }
        const entries = Object.values(this.registeredItems);
        if (!entries.length) {
          return;
        }
        const order = entries
          .sort((a, b) => a.position - b.position)
          .map((entry, index) => `${index + 1}. ${entry.label}`)
          .join(', ');
        this.sendPoliteMessage(this.currentOrder$({ order }));
      },
    },
    // render the first element passed in without a wrapper node
    render() {
      return this.$slots.default[0];
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  /deep/ .sortable-item--mirror {
    @extend %dropshadow-6dp;

    z-index: 8;
    cursor: grabbing;
    border-radius: $radius;
  }

  /deep/ .sortable-item--ghost {
    visibility: hidden;
  }

  /deep/ .sortable-item--placed {
    animation-name: bounce-in;
    animation-duration: $core-time;
  }

  @keyframes bounce-in {
    0% {
      transform: scale3d(1.05, 1.05, 1.05);
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }

    50% {
      transform: scale3d(0.98, 0.98, 0.98);
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }

    100% {
      transform: scale3d(1, 1, 1);
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
  }

</style>
