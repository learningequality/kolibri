<template>

  <CoreMenuOption
    :label="coreString('signInLabel')"
    :link="url"
    icon="login"
  />

</template>


<script>

  import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  const component = {
    name: 'LoginSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoreStrings],
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.user:user']();
      },
    },
    role: UserKinds.ANONYMOUS,
    priority: 10,
    section: NavComponentSections.ACCOUNT,
  };

  navComponents.register(component);

  export default component;

</script>
