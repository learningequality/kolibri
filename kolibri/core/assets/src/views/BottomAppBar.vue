<template>

  <div class="bottom" :style="{backgroundColor: $themeTokens.surface}">
    <div class="inner-bottom" :style="innerStyle">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import KThemeMixin from 'kolibri-components/src/mixins/KThemeMixin';

  export default {
    name: 'BottomAppBar',
    mixins: [KThemeMixin],
    props: {
      maxWidth: {
        type: Number,
        default: 960,
      },
    },
    computed: {
      innerStyle() {
        if (this.maxWidth) {
          return { maxWidth: `${this.maxWidth}px` };
        }
        return null;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .bottom {
    @extend %dropshadow-8dp;

    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 8; // material - Bottom app bar
    height: 72px;
    padding: 8px 16px;
    margin: 0;
    overflow-x: hidden;
    font-size: 14px;
    text-align: right;
  }

  .inner-bottom {
    margin: auto;
  }

</style>
