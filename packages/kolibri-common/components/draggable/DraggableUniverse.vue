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
      const { isDragging } = useDraggableUniverse({ name: props.name, delay: props.delay });

      watch(isDragging, dragging => emit(dragging ? 'dragstart' : 'dragend'));
    },
    props: {
      // Element to render as the universe root
      tag: {
        type: String,
        default: 'div',
      },
      // Explicit SortableJS group name shared by this universe's regions
      name: {
        type: String,
        default: null,
      },
      delay: {
        type: Number,
        default: 250,
      },
    },
  };

</script>
