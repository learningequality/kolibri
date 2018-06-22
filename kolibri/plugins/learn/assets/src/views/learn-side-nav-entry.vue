<template>

  <core-menu-option
    :label="$tr('learn')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="school"
      category="social"
    />
  </core-menu-option>

</template>


<script>

  import coreMenuOption from 'kolibri.coreVue.components.coreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'learnSideNavEntry',
    components: {
      coreMenuOption,
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


<style lang="stylus" scoped></style>
