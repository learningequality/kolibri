<template>

  <CoreMenuOption
    :label="learnString('learnLabel')"
    :link="url"
    icon="learn"
  />

</template>


<script>

  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import commonLearnStrings from './commonLearnStrings';

  const component = {
    name: 'LearnSideNavEntry',
    mixins: [commonLearnStrings],
    components: {
      CoreMenuOption,
    },
    $trs: {},
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.learn:learn']();
      },
    },
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>
