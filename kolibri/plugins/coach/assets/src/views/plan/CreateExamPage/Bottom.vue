<template>

  <div class="bottom" :style="{backgroundColor: $coreBgLight}">
    <div class="inner-bottom">
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'Bottom',
    mixins: [themeMixin],
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
    max-width: 960px;
    margin: auto;
  }

</style>
