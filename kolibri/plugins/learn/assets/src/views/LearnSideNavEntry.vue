<template>

  <CoreMenuOption
    ref="firstMenu"
    :label="learnString('learnLabel')"
    :subRoutes="learnRoutes"
    :link="url"
    icon="learn"
  />

</template>


<script>

  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import baseRoutes from '../routes/baseRoutes';
  import commonLearnStrings from './commonLearnStrings';

  const component = {
    name: 'LearnSideNavEntry',
    mixins: [commonLearnStrings, commonCoreStrings],
    components: {
      CoreMenuOption,
    },
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.learn:learn']();
      },
      learnRoutes() {
        return [
          {
            label: this.coreString('homeLabel'),
            route: baseRoutes.home.path,
          },
          {
            label: this.coreString('libraryLabel'),
            route: baseRoutes.library.path,
          },
          {
            label: this.coreString('bookmarksLabel'),
            route: baseRoutes.bookmarks.path,
          },
        ];
      },
    },
    priority: 10,
    bottomBar: true,
  };

  navComponents.register(component);

  export default component;

</script>
