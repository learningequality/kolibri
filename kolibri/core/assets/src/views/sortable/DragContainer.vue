<script>

  // Implemention inspired by an excellent demo at:
  // https://github.com/adamwathan/vue-shopify-sortable-demo

  import {
    Sortable,
    Plugins,
    Draggable,
  } from '@shopify/draggable/lib/es5/draggable.bundle.legacy.js';
  import { SORTABLE_CLASS, HANDLE_CLASS } from './classDefinitions';

  export default {
    name: 'DragContainer',
    components: {},
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
    mounted() {
      // next tick just to be safe
      this.$nextTick(this.initialize);
    },
    beforeDestroy() {
      this.sortable.destroy();
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
      },
      handleStart() {
        // handle cancelation of drags
        // document.addEventListener('keyup', this.triggerMouseUpOnESC);
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

  @import '~kolibri.styles.definitions';

  /deep/ .draggable-mirror {
    @extend %dropshadow-8dp;

    z-index: 8;
    cursor: grabbing;
    border-radius: $radius;
  }

  /deep/ .draggable-source--is-dragging {
    visibility: hidden;
  }

  /deep/ .draggable-source--placed {
    animation-name: bounceIn;
    animation-duration: $core-time;
  }

  @keyframes bounceIn {
    from,
    50%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    0% {
      transform: scale3d(01.15, 01.15, 01.15);
    }
    50% {
      transform: scale3d(0.98, 0.98, 0.98);
    }
    to {
      transform: scale3d(1, 1, 1);
    }
  }

</style>
