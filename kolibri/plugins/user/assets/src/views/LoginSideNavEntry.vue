<template>

  <CoreMenuOption
    :label="coreString('signInLabel')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="exit_to_app"
      category="action"
      :class="{ 'rtl-icon': isRtl }"
    />
  </CoreMenuOption>

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
    $trs: {},
    computed: {
      url() {
        return urls['kolibri:user:user']();
      },
    },
    role: UserKinds.ANONYMOUS,
    priority: 10,
    section: NavComponentSections.ACCOUNT,
  };

  navComponents.register(component);

  export default component;

</script>
