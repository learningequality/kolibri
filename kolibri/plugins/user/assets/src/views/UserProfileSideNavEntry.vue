<template>

  <!-- eslint-disable kolibri/vue-no-undefined-string-uses -->
  <CoreMenuOption
    :label="$tr('profile')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="account_circle"
      category="action"
    />
  </CoreMenuOption>

</template>


<script>

  import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'UserProfileSideNavEntry',
    components: {
      CoreMenuOption,
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
    section: NavComponentSections.ACCOUNT,
  };

  navComponents.register(component);

  export default component;

</script>
