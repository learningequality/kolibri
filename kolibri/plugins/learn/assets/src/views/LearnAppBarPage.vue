<template>

  <AppBarPage
    :title="appBarTitle"
    :appearanceOverrides="appearanceOverrides"
    :loading="loading"
  >

    <template #subNav>
      <LearnTopNav ref="topNav" :ariaLabel="$tr('learnPageMenuLabel')" />
    </template>

    <slot></slot>

  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearnTopNav from './LearnTopNav';

  export default {
    name: 'LearnAppBarPage',
    components: { AppBarPage, LearnTopNav },
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
    $trs: {
      learnPageMenuLabel: {
        message: 'Learn page menu',
        context: 'Indicates the purpose of a navigation bar at the top of the page',
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
