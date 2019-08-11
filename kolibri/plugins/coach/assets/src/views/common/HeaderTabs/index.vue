<template>

  <div
    class="tab-block"
    :class="{ small: windowIsSmall }"
    :style="{ borderBottomColor: $themeTokens.fineLine }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-components/src/mixins/KResponsiveWindowMixin';
  import KThemeMixin from 'kolibri-components/src/mixins/KThemeMixin';

  export default {
    name: 'HeaderTabs',
    mixins: [KResponsiveWindowMixin, KThemeMixin],
  };

</script>


<style lang="scss" scoped>

  .tab-block {
    padding-right: 24px;
    padding-left: 24px;
    margin-right: -24px;
    margin-bottom: 24px;
    margin-left: -24px;
    border-bottom-style: solid;
    border-bottom-width: 1px;
  }

  .small {
    padding-right: 16px;
    padding-left: 16px;
    margin-right: -16px;
    margin-bottom: 16px;
    margin-left: -16px;
  }

</style>
