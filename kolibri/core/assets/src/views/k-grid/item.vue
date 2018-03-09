<template>

  <div :class="unitClass">
    <slot></slot>
  </div>

</template>


<script>

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
  };

</script>


<style lang="stylus" scoped></style>
