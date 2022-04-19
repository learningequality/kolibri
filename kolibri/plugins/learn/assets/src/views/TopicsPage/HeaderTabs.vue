<template>

  <!-- Stolen from Coach -->
  <div
    v-show="enablePrint || !$isPrint"
    class="tab-block"
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
    position: absolute;
    bottom: 0;
    margin-bottom: 0;
  }

</style>
