<template>

  <CoreMenuOption
    :label="learnCommon$tr('learnLabel')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="school"
      category="social"
    />
  </CoreMenuOption>

</template>


<script>

  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { learnStringsMixin } from './commonLearnStrings';

  const component = {
    name: 'LearnSideNavEntry',
    mixin: [learnStringsMixin],
    components: {
      CoreMenuOption,
    },
    $trs: {},
    computed: {
      url() {
        return urls['kolibri:learn:learn']();
      },
    },
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>
