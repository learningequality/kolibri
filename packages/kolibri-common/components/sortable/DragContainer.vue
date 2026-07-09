<script>

  // Implemention inspired by an excellent demo at:
  // https://github.com/adamwathan/vue-shopify-sortable-demo

  import {
    Sortable,
    Plugins,
    Draggable,
  } from '@shopify/draggable/lib/es5/draggable.bundle.legacy.js';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { SORTABLE_CLASS, HANDLE_CLASS } from './classDefinitions';
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
          delay: 250,
          mirror: {
            constrainDimensions: true,
            xAxis: false,
          },
          plugins: [Plugins.SwapAnimation],
        });

        // Remove default focusable plugin and undo damage.
        // ref: https://github.com/Shopify/draggable/issues/317
        this.sortable.removePlugin(Draggable.Plugins.Focusable);
        this.$el.tabIndex = -1;
        Array.from(this.$el.children).forEach(child => (child.tabIndex = -1));

        // hook up event listeners
        this.sortable.on('sortable:start', this.handleStart);
        this.sortable.on('sortable:stop', this.handleStop);
        this.sortable.on('sortable:moveDown', this.moveDownOne);
        this.sortable.on('sortable:moveUp', this.moveUpOne);

        this.$el.addEventListener('focusout', this.handleFocusOut);
      },
      handleStart() {
        // handle cancelation of drags
        // document.addEventListener('keyup', this.triggerMouseUpOnESC);
        this.$emit('dragStart');
      },
      handleStop(event) {
        const { oldIndex, newIndex } = event.data;
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
        // document.removeEventListener('keyup', this.triggerMouseUpOnESC);
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
    triggerMouseUpOnESC(event) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        // this.sortable.cancel();
        // const clickEvent = document.createEvent("MouseEvents");
        // clickEvent.initEvent("mouseup", true, true);
        // document.dispatchEvent(clickEvent);
      }
    },
    // render the first element passed in without a wrapper node
    render() {
      return this.$slots.default[0];
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  /deep/ .draggable-mirror {
    @extend %dropshadow-6dp;

    z-index: 8;
    cursor: grabbing;
    border-radius: $radius;
  }

  /deep/ .draggable-source--is-dragging {
    visibility: hidden;
  }

  /deep/ .draggable-source--placed {
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
