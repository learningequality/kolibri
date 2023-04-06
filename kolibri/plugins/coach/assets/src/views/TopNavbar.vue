<template>

  <HorizontalNavBarWithOverflowMenu
    v-if="classId"
    :navigationLinks="links"
  />

</template>


<script>

  import { mapState } from 'vuex';
  import HorizontalNavBarWithOverflowMenu from 'kolibri.coreVue.components.HorizontalNavBarWithOverflowMenu';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import { coachStringsMixin } from './common/commonCoachStrings';

  export default {
    name: 'TopNavbar',
    components: {
      HorizontalNavBarWithOverflowMenu,
    },
    mixins: [coachStringsMixin, commonCoreStrings],

    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      links() {
        return [
          {
            title: this.coreString('classHome'),
            link: this.navRoute(PageNames.HOME_PAGE),
            icon: 'dashboard',
            color: this.$themeTokens.textInverted,
          },
          {
            title: this.coachString('reportsLabel'),
            link: this.navRoute(PageNames.REPORTS_PAGE),
            icon: 'reports',
            color: this.$themeTokens.textInverted,
          },
          {
            title: this.coachString('planLabel'),
            link: this.navRoute(PageNames.PLAN_PAGE),
            icon: 'edit',
            color: this.$themeTokens.textInverted,
          },
        ];
      },
    },
    methods: {
      navRoute(name) {
        return this.classId ? { name, params: { classId: this.classId } } : { name };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
