<template>

  <KNavbar v-if="classId">
    <KNavbarLink
      :title="$tr('home')"
      :link="navRoute('HomePage')"
    >
      <mat-svg name="dashboard" category="action" />
    </KNavbarLink>
    <KNavbarLink
      :title="common$tr('reportsLabel')"
      :link="navRoute(PageNames.REPORTS_PAGE)"
    >
      <mat-svg name="insert_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('plan')"
      :link="navRoute(PageNames.PLAN_PAGE)"
    >
      <mat-svg name="edit" category="image" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import { mapState } from 'vuex';
  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { PageNames } from '../constants';
  import { coachStringsMixin } from './common/commonCoachStrings';

  export default {
    name: 'TopNavbar',
    components: {
      KNavbar,
      KNavbarLink,
    },
    mixins: [coachStringsMixin],
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      PageNames() {
        return PageNames;
      },
    },
    methods: {
      navRoute(name) {
        return { name, params: { classId: this.classId } };
      },
    },
    $trs: {
      home: 'Class Home',
      plan: 'Plan',
    },
  };

</script>


<style lang="scss" scoped></style>
