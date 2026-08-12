<script>

  import { getCurrentInstance } from 'vue';
  import useDraggableRegion from './useDraggableRegion';
  import renderSlotRoot from './renderSlotRoot';

  export default {
    name: 'DraggableRegion',
    setup(props, { emit }) {
      const instance = getCurrentInstance();
      // the element the consumer wrote as the region's root: the list SortableJS sorts
      useDraggableRegion(props, emit, () => instance.proxy.$el);
    },
    props: {
      /* eslint-disable vue/no-unused-properties */
      items: {
        type: Array,
        required: true,
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
    render() {
      return renderSlotRoot(this);
    },
  };

</script>


<!-- here rather than in DraggableUniverse because a region can be used without a
     universe wrapper, and every drag involves a region -->
<style lang="scss">

  @import './draggable';

</style>
