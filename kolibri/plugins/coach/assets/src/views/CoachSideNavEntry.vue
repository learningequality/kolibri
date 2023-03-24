<template>

  <CoreMenuOption
    :label="coreString('coachLabel')"
    icon="coach"
    :subRoutes="coachRoutes"
    :link="url"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import baseRoutes from '../routes/baseRoutes';
  import commonCoach from './common.js';
  import { coachStringsMixin } from './common/commonCoachStrings';

  const component = {
    name: 'CoachSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoach, commonCoreStrings, coachStringsMixin],
    computed: {
      url() {
        return urls['kolibri:kolibri.plugins.coach:coach']();
      },
      coachRoutes() {
        return [
          {
            label: this.coreString('classHome'),
            route: baseRoutes.classHome.path,
          },
          {
            label: this.coachString('reportsLabel'),
            route: baseRoutes.reports.path,
          },
          {
            label: this.coachString('plan'),
            route: baseRoutes.plan.path,
          },
        ];
      },
    },
    role: UserKinds.COACH,
    priority: 10,
  };

  navComponents.register(component);

  export default component;

</script>


<style lang="scss" scoped>

  .link-container {
    height: 44px;
  }

  .link {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 44px;
    margin-left: 40px;
    font-size: 12px;
    text-decoration: none;
  }

</style>
