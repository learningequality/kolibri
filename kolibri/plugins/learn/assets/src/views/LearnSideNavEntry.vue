<template>

  <CoreMenuOption
    ref="firstMenu"
    :label="learnString('learnLabel')"
    :subRoutes="baseRoutes"
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
      baseRoutes() {
        return baseRoutes;
      },
    },
    priority: 10,
    bottomBar: true,
  };

  navComponents.register(component);

  export default component;

</script>
