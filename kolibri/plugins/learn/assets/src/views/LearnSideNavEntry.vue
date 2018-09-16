<template>

  <CoreMenuOption
    :label="$tr('learn')"
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

  const component = {
    name: 'LearnSideNavEntry',
    components: {
      CoreMenuOption,
    },
    $trs: {
      learn: 'Learn',
    },
    computed: {
      url() {
        return urls['kolibri:learnplugin:learn']();
      },
    },
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>
