<template>

  <div>
    <CoreMenuOption
      :label="coreString('coachLabel')"
      :iconAfter="iconAfter"
      icon="coach"
      @select="handleMenu()"
    />
    <div v-if="isAppContext && visibleSubMenu">
      <a
        href="#"
        class="link"
        :class="$computedClass(optionStyle)"
      > {{ coachString('plan') }} </a>
      <a
        href="#"
        class="link"
        :class="$computedClass(optionStyle)"
      > {{ coachString('reportsLabel') }} </a>
    </div>
  </div>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { mapGetters } from 'vuex';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import navComponents from 'kolibri.utils.navComponents';
  import urls from 'kolibri.urls';
  import { generateSideNavReportRoute, generateSideNavPlanRoute } from '../appNavigationRoutes.js';
  import { coachStringsMixin } from './common/commonCoachStrings';
  import commonCoach from './common.js';

  const component = {
    name: 'CoachSideNavEntry',
    components: {
      CoreMenuOption,
    },
    mixins: [commonCoach, commonCoreStrings, coachStringsMixin],
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    computed: {
      ...mapGetters(['isAppContext']),
      url() {
        return urls['kolibri:kolibri.plugins.coach:coach']();
      },
      optionStyle() {
        return {
          color: this.$themeTokens.text,
          textDecoration: 'none',
          ':hover': {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
          },
          ':focus': this.$coreOutline,
        };
      },
      iconAfter() {
        if (this.isAppContext) {
          return this.visibleSubMenu ? 'chevronUp' : 'chevronDown';
        }
      },
    },
    methods: {
      generateSideNavPlanRoute(route) {
        return generateSideNavPlanRoute(route);
      },
      generateSideNavReportRoute(route) {
        return generateSideNavReportRoute(route);
      },
      redirectToRoute() {
        window.location = this.url;
      },
      handleMenu() {
        // in the app, and there is an active class ID
        if (this.isAppContext) {
          this.visibleSubMenu = !this.visibleSubMenu;
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
