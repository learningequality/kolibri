<script>

  import { computed } from 'vue';
  import { ITEM_CLASS, DISABLED_CLASS } from './classDefinitions';
  import renderSlotRoot from './renderSlotRoot';

  export default {
    name: 'DraggableItem',
    setup(props) {
      // the classes SortableJS matches as its drag item
      const itemClasses = computed(() => [ITEM_CLASS, { [DISABLED_CLASS]: props.disabled }]);
      return { itemClasses };
    },
    props: {
      // When true, this item can't be dragged
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    // marks the element the consumer wrote, rather than wrapping it in one of its own
    render() {
      return renderSlotRoot(this, this.itemClasses);
    },
  };

</script>
