<template>

  <Navbar v-if="classId">
    <NavbarLink
      :title="$tr('home')"
      :link="navRoute('HomePage')"
    >
      <KIcon
        icon="dashboard"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </NavbarLink>
    <NavbarLink
      :title="coachString('reportsLabel')"
      :link="navRoute(PageNames.REPORTS_PAGE)"
    >
      <KIcon
        icon="reports"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </NavbarLink>
    <NavbarLink
      :title="$tr('plan')"
      :link="navRoute(PageNames.PLAN_PAGE)"
    >
      <KIcon
        icon="edit"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
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
      home: {
        message: 'Class Home',
        context:
          "Tab name of the main 'Class' section where the coach can see all the information relating to a specific class.\n",
      },
      plan: {
        message: 'Plan',
        context:
          "Translate as a VERB. Refers to the 'Plan' tab where coaches manage lessons, quizzes, and groups.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
