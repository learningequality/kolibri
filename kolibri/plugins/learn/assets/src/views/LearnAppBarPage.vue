<template>

  <AppBarCorePage
    :title="appBarTitle"
    :appearanceOverrides="appearanceOverrides"
    :loading="loading"
  >

    <template #subNav>
      <LearnTopNav ref="topNav" />
    </template>

    <slot></slot>

  </AppBarCorePage>

</template>


<script>

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
      appearanceOverrides: {
        type: Object,
        required: false,
        default: null,
      },
      loading: {
        type: Boolean,
        default: null,
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
