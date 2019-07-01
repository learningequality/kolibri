<template>

  <div class="side-bar" :style="{ backgroundColor: $themeColors.palette.grey.v_100 }">
    <slot></slot>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'SideBar',
    mixins: [themeMixin],
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import './EpubStyles';

  .side-bar {
    @extend %dropshadow-1dp;

    z-index: 3;
    width: 250px;
    padding: 16px;
    overflow-y: auto;
    word-wrap: break-word;
  }

</style>
