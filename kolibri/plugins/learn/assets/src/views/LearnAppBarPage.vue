<template>

  <AppBarCorePage :title="appBarTitle" :applyStandardLayout="applyStandardLayout">

    <template #subNav>
      <LearnTopNav ref="topNav" />
    </template>

    <div v-if="!loading" :style="styles">
      <slot></slot>
    </div>
    <KLinearLoader
      v-if="loading"
      class="loader"
      type="indeterminate"
      :delay="false"
    />

  </AppBarCorePage>

</template>


<script>

  import { mapState } from 'vuex';
  import AppBarCorePage from 'kolibri.coreVue.components.AppBarCorePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearnTopNav from './LearnTopNav';

  export default {
    name: 'LearnAppBarPage',
    components: { AppBarCorePage, LearnTopNav },
    mixins: [commonCoreStrings],
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
      applyStandardLayout: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      ...mapState({
        loading: state => state.core.loading,
      }),
      styles() {
        return this.applyStandardLayout ? 'max-width: 1000px; margin: 0 auto;' : '';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    position: fixed;
    top: 64px;
    right: 0;
    left: 0;
  }

</style>
