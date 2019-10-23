<template>

  <Navbar v-if="classId">
    <NavbarLink
      :title="$tr('home')"
      :link="navRoute('HomePage')"
    >
      <mat-svg name="dashboard" category="action" />
    </NavbarLink>
    <NavbarLink
      :title="coachString('reportsLabel')"
      :link="navRoute(PageNames.REPORTS_PAGE)"
    >
      <mat-svg name="insert_chart" category="editor" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('plan')"
      :link="navRoute(PageNames.PLAN_PAGE)"
    >
      <mat-svg name="edit" category="image" />
    </NavbarLink>
  </Navbar>

</template>


<script>

  import { mapState } from 'vuex';
  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import { PageNames } from '../constants';
  import { coachStringsMixin } from './common/commonCoachStrings';

  export default {
    name: 'TopNavbar',
    components: {
      Navbar,
      NavbarLink,
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
