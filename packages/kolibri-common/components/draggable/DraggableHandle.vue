<template>

  <component
    :is="tag"
    :class="handleClass"
    v-on="$listeners"
  >
    <slot></slot>
  </component>

</template>


<script>

  import { HANDLE_CLASS } from './classDefinitions';

  export default {
    name: 'DraggableHandle',
    setup() {
      // The class SortableJS matches as its drag handle
      return { handleClass: HANDLE_CLASS };
    },
    props: {
      tag: {
        type: String,
        default: 'div',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .draggable-handle {
    cursor: grab;
  }

</style>
