<template>

  <div
    class="page-container"
    :class="{small : windowIsSmall }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'KPageContainer',
    mixins: [responsiveWindow],
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .page-container {
    @extend %dropshadow-1dp;

    padding: 8px 24px 24px;
    margin-top: 24px;
    background-color: white;
    border-radius: 4px;
  }

  .page-container.small {
    padding: 8px 16px 16px;
  }

</style>
