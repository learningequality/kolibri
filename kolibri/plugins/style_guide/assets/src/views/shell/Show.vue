<template>

  <div>
    <slot></slot>
  </div>

</template>


<script>

  import HorizontalRule from './KHorizontalRule';

  export default {
    name: 'Show',
    components: {
      HorizontalRule,
    },
    props: {
      hideTop: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
