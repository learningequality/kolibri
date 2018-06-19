<template>

  <core-menu-option
    :label="$tr('coach')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="assessment"
      category="action"
    />
  </core-menu-option>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import coreMenuOption from 'kolibri.coreVue.components.coreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'coachSideNavEntry',
    components: {
      coreMenuOption,
    },
    $trs: {
      coach: 'Coach',
    },
    computed: {
      url() {
        return urls['kolibri:coach:coach']();
      },
    },
    role: UserKinds.COACH,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="stylus" scoped></style>
