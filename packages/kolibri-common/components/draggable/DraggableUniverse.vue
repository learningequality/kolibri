<template>

  <component :is="tag">
    <slot></slot>
  </component>

</template>


<script>

  import { watch } from 'vue';
  import useDraggableUniverse from './useDraggableUniverse';

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
      // Element to render as the universe root
      tag: {
        type: String,
        default: 'div',
      },
      // Explicit SortableJS group name shared by this universe's regions.
      // Applied when the universe is created; later changes are ignored.
      name: {
        type: String,
        default: null,
      },
      // Press-and-hold delay (ms) before a drag begins
      delay: {
        type: Number,
        default: 250,
      },
    },
  };

</script>
