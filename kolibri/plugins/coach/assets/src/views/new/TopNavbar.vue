<template>

  <KNavbar v-if="classId">
    <KNavbarLink
      :title="$tr('home')"
      :link="navRoute(PageNames.HOME_PAGE)"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="coachStrings.$tr('reportsLabel')"
      :link="navRoute(PageNames.REPORTS_PAGE)"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('plan')"
      :link="navRoute(PageNames.PLAN_PAGE)"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import { mapState } from 'vuex';
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
      ...mapState(['classId']),
      PageNames() {
        return PageNames;
      },
    },
    methods: {
      navRoute(name) {
        return { name, params: { classId: this.classId } };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
