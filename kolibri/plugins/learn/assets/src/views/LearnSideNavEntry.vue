<template>

  <CoreMenuOption
    ref="firstMenu"
    :label="learnString('learnLabel')"
    :subRoutes="learnRoutes"
    icon="learn"
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

  const url = urls['kolibri:kolibri.plugins.learn:learn']();
  const component = {
    name: 'LearnSideNavEntry',
    mixins: [commonLearnStrings, commonCoreStrings],
    components: {
      CoreMenuOption,
    },
    computed: {
      learnRoutes() {
        return {
          home: {
            text: this.coreString('homeLabel'),
            icon: 'dashboard',
            route: generateNavRoute(url, LearnPageNames.HOME, baseRoutes),
          },
          library: {
            text: this.coreString('libraryLabel'),
            icon: 'library',
            route: generateNavRoute(url, LearnPageNames.LIBRARY, baseRoutes),
          },
          bookmarks: {
            text: this.coreString('bookmarksLabel'),
            icon: 'bookmark',
            route: generateNavRoute(url, LearnPageNames.BOOKMARKS, baseRoutes),
          },
        };
      },
    },
    methods: {
      generateNavRoute(route) {
        return generateNavRoute(url, route, baseRoutes);
      },
    },
    priority: 10,
    bottomBar: true,
    bottomBarRoutes: [
      {
        text: 'homeLabel',
        icon: 'dashboard',
        route: generateNavRoute(url, LearnPageNames.HOME, baseRoutes),
      },
      {
        text: 'libraryLabel',
        icon: 'library',
        route: generateNavRoute(url, LearnPageNames.LIBRARY, baseRoutes),
      },
      {
        text: 'bookmarksLabel',
        icon: 'bookmark',
        route: generateNavRoute(url, LearnPageNames.BOOKMARKS, baseRoutes),
      },
    ],
  };

  navComponents.register(component);

  export default component;

</script>
