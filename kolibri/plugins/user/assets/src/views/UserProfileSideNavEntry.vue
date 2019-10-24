<template>

  <CoreMenuOption
    :label="$tr('profile')"
    :link="url"
    icon="profile"
  />

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
        return urls['kolibri:kolibri.plugins.user:user']();
      },
    },
    role: UserKinds.LEARNER,
    priority: 10,
    section: NavComponentSections.ACCOUNT,
  };

  navComponents.register(component);

  export default component;

</script>
