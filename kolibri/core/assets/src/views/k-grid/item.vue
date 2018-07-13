<template>

  <div :class="unitClass">
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'KGridItem',
    props: {
      size: {
        type: [Number, String],
        required: true,
      },
      cols: {
        type: [Number, String],
        required: true,
      },
    },
    computed: {
      unitClass() {
        return `pure-u-${this.size}-${this.cols}`;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
