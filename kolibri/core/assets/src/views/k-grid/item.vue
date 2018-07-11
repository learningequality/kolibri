<template>

  <div :class="unitClass">
    <slot></slot>
  </div>

</template>


<script>

  /**
   * Grid layout items
   */
  export default {
    name: 'kGridItem',
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
    mounted() {
      // console.log('mounted', this.$parent);
    },
  };

</script>


<style lang="scss" scoped></style>
