<script>

  import { watch } from 'vue';
  import useDraggableUniverse from './useDraggableUniverse';
  import renderSlotRoot from './renderSlotRoot';

  export default {
    name: 'DraggableUniverse',
    setup(props, { emit }) {
      const { isDragging, delay } = useDraggableUniverse({ name: props.name, delay: props.delay });

      watch(isDragging, dragging => emit(dragging ? 'dragstart' : 'dragend'));
      watch(
        () => props.delay,
        value => (delay.value = value),
      );
    },
    props: {
      // Explicit SortableJS group name shared by this universe's regions.
      // Applied when the universe is created; later changes are ignored.
      name: {
        type: String,
        default: null,
      },
      // Press-and-hold delay (ms) before a drag begins (touch input only)
      delay: {
        type: Number,
        default: 250,
      },
    },
    // Renders the one element the consumer wrote around its regions. A consumer whose
    // regions have no common element can call `useDraggableUniverse()` from its own
    // `setup()` instead of using this component.
    render() {
      return renderSlotRoot(this);
    },
  };

</script>
