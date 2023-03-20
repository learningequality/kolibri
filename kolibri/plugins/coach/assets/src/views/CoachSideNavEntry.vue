<template>

  <CoreMenuOption
    :label="coreString('coachLabel')"
    icon="coach"
    :subRoutes="coachRoutes"
  />

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { PageNames } from '../constants';
  import { generateNavRoute } from '../../../../../core/assets/src/utils/generateNavRoutes';
  import navigationBaseRoutes from '../routes/navigationBaseRoutes';
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
        return {
          home: {
            text: this.coreString('classHome'),
            route: this.generateNavRoute(PageNames.HOME_PAGE),
          },
          plan: {
            text: this.coachString('reportsLabel'),
            route: this.generateNavRoute(PageNames.REPORTS_PAGE),
          },
          reports: {
            text: this.coachString('plan'),
            route: this.generateNavRoute(PageNames.PLAN_PAGE),
          },
        };
      },
    },
    methods: {
      generateNavRoute(route) {
        // if class id
        let params;
        if (this.$router.currentRoute.params.classId) {
          params = this.$router.currentRoute.params;
          return generateNavRoute(this.url, route, navigationBaseRoutes, params);
        } else {
          // otherwise, go to class page and then have the next
          return generateNavRoute(
            this.url,
            PageNames.COACH_CLASS_LIST_PAGE,
            navigationBaseRoutes,
            params,
            route
          );
        }
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
