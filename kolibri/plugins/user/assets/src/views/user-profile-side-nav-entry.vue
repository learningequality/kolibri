<template>

  <core-menu-option
    :label="$tr('profile')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="account_circle"
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
    name: 'userProfileSideNavEntry',
    components: {
      coreMenuOption,
    },
    $trs: {
      profile: 'Profile',
    },
    computed: {
      url() {
        return urls['kolibri:user:user']();
      },
    },
    role: UserKinds.LEARNER,
    priority: 10,
    section: 'account',
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="stylus" scoped></style>
