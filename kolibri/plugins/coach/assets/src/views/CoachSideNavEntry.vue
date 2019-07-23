<template>

  <CoreMenuOption
    :label="coreString('coachLabel')"
    :link="url"
  >
    <mat-svg
      slot="icon"
      name="assessment"
      category="action"
    />
  </CoreMenuOption>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';

  const component = {
    name: 'CoachSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoreStrings],
    $trs: {},
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
