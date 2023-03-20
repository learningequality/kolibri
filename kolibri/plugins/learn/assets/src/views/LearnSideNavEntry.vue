<template>

  <CoreMenuOption
    ref="firstMenu"
    :label="learnString('learnLabel')"
    icon="learn"
    :subRoutes="learnRoutes"
  />

</template>


<script>

  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames as LearnPageNames } from '../constants';
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
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
        return {
          home: {
            text: this.coreString('homeLabel'),
            icon: 'dashboard',
            route: LearnPageNames.HOME,
          },
          library: {
            text: this.learnString('libraryLabel'),
            icon: 'library',
            route: LearnPageNames.LIBRARY,
          },
          bookmarks: {
            text: this.coreString('bookmarksLabel'),
            icon: 'bookmark',
            route: LearnPageNames.BOOKMARKS,
          },
        };
      },
    },
    methods: {
      generateNavRoute(route) {
        return generateNavRoute(this.url, route, baseRoutes);
      },
    },
    priority: 10,
    bottomBar: true,
  };

  navComponents.register(component);

  export default component;

</script>
