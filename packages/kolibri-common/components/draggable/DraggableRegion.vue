<template>

  <component
    :is="tag"
    ref="root"
  >
    <slot></slot>
  </component>

</template>


<script>

  import { ref } from 'vue';
  import useDraggableRegion from './useDraggableRegion';

  export default {
    name: 'DraggableRegion',
    setup(props, { emit }) {
      const root = ref(null);
      useDraggableRegion(props, emit, root);
      return { root };
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      items: {
        type: Array,
        required: true,
      },
      tag: {
        type: String,
        default: 'div',
      },
      capacity: {
        type: Number,
        default: null,
      },
      // Copy instead of move when dragging out of this region. `true` copies each
      // item with a shallow copy that keeps its identifiers; pass a function to
      // build the copy yourself, e.g. to assign a new id.
      clone: {
        type: [Boolean, Function],
        default: false,
      },
      // for the items
      sortable: {
        type: Boolean,
        default: true,
      },
      // for the region
      disabled: {
        type: Boolean,
        default: false,
      },
      accepts: {
        type: Function,
        default: () => true,
      },
      label: {
        type: String,
        default: null,
      },
      /* eslint-enable vue/no-unused-properties */
    },
  };

</script>


<!-- here rather than in DraggableUniverse because a region can be used without a
     universe wrapper, and every drag involves a region -->
<style lang="scss">

  @import './draggable';

</style>
