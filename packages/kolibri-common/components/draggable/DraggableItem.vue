<template>

  <component
    :is="tag"
    :class="itemClasses"
    v-on="$listeners"
  >
    <slot></slot>
  </component>

</template>


<script>

  import { computed } from 'vue';
  import { ITEM_CLASS, DISABLED_CLASS } from './classDefinitions';

  export default {
    name: 'DraggableItem',
    setup(props) {
      // the classes SortableJS matches as its drag item
      const itemClasses = computed(() => [ITEM_CLASS, { [DISABLED_CLASS]: props.disabled }]);
      return { itemClasses };
    },
    props: {
      tag: {
        type: String,
        default: 'div',
      },
      // When true, this item can't be dragged
      disabled: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>
