<template>

  <KNavbar>
    <KNavbarLink
      :title="$tr('home')"
      :link="route(PageNames.HOME_PAGE, {classId})"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="coachStrings.$tr('reportsLabel')"
      :link="link('ReportsLessonListPage')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('plan')"
      :link="link('PlanLessonListPage')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { PageNames } from '../../constants/newConstants';
  import { coachStringsMixin } from './shared/commonCoachStrings';

  export default {
    name: 'TopNavbar',
    components: {
      KNavbar,
      KNavbarLink,
    },
    mixins: [coachStringsMixin],
    $trs: {
      home: 'Class Home',
      plan: 'Plan',
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      PageNames() {
        return PageNames;
      },
    },
    methods: {
      route(name, params) {
        return { name, params };
      },
      link(page) {
        return {
          name: PageNames.NEW_COACH_PAGES,
          params: {
            page,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
