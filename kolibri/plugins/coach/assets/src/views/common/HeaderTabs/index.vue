<template>

  <div
    v-show="enablePrint || !$isPrint"
    class="tab-block"
    :class="{ small: windowIsSmall }"
    :style="{ borderBottomColor: !$isPrint ? $themeTokens.fineLine : 'transparent' }"
  >
    <slot></slot>
  </div>

</template>


<script>

  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'HeaderTabs',
    mixins: [responsiveWindowMixin],
    props: {
      enablePrint: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
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
