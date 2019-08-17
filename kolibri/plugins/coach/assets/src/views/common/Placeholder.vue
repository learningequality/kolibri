<template>

  <span class="placeholder-wrapper">
    <slot v-if="ready"></slot>
    <span v-else class="placeholder" :style="placeholderStyle"></span>
  </span>

</template>


<script>

  export default {
    name: 'Placeholder',
    props: {
      ready: {
        type: Boolean,
        default: false,
      },
      width: {
        type: String,
        default: '50px',
      },
      height: {
        type: String,
        default: '1.2em',
      },
    },
    computed: {
      placeholderStyle() {
        return {
          backgroundColor: this.$themeTokens.textDisabled,
          width: this.width,
          height: this.height,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .placeholder-wrapper {
    position: relative;
    display: inline-block;
  }

  .placeholder {
    display: inline-block;
    border-radius: 2px;
  }

</style>
