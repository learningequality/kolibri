<template>

  <div>
    <CoreMenuOption
      :label="coreString('coachLabel')"
      :link="isAppContext ? null : url"
      :iconAfter="iconAfter"
      icon="coach"
      @select="handleMenu()"
    />
    <div v-if="isAppContext && visibleSubMenu">
      <div v-for="(nestedObject, key) in coachRoutes" :key="key">
        <div class="link-container">
          <a
            :href="nestedObject.route"
            class="link"
            :class="$computedClass(subpathStyles(nestedObject.route))"
            @click="handleNav(nestedObject.route)"
          >
            {{ nestedObject.text }}
          </a>
        </div>
      </div>
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
    data() {
      return {
        visibleSubMenu: false,
      };
    },
    mounted() {
      this.submenuShouldBeOpen();
    },
    computed: {
      ...mapGetters(['isAppContext']),
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
      iconAfter() {
        if (this.isAppContext) {
          return this.visibleSubMenu ? 'chevronUp' : 'chevronDown';
        }
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
      handleMenu() {
        // in the app, and there is an active class ID
        if (this.isAppContext) {
          this.visibleSubMenu = !this.visibleSubMenu;
        }
      },
      toggleAndroidMenu() {
        this.$emit('toggleAndroidMenu');
      },
      isActiveLink(route) {
        return route.includes(this.$router.currentRoute.path);
      },
      submenuShouldBeOpen() {
        // which plugin are we currently in?
        this.visibleSubMenu = window.location.pathname.includes(this.url);
      },
      subpathStyles(route) {
        if (this.isActiveLink(route)) {
          return {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
            textDecoration: 'none',
          };
        }
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
      handleNav(route) {
        this.isActiveLink(route) ? this.toggleAndroidMenu() : null;
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
