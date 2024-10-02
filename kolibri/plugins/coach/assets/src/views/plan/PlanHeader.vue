<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled || userIsMultiFacilityAdmin"
        :to="$router.getRoute('HomePage', { classId: $route.params.classId })"
        :text="coreString('classHome')"
      />
    </p>
    <slot name="header"></slot>
    <div v-if="!$slots.header">
      <h1>{{ $tr('planYourClassLabel') }}</h1>
      <p>{{ $tr('planYourClassDescription') }}</p>
    </div>
    <HeaderTabs :style="{ marginTop: '28px' }">
      <KTabsList
        ref="tabsList"
        :tabsId="PLAN_TABS_ID"
        :ariaLabel="$tr('coachPlan')"
        :activeTabId="activeTabId"
        :tabs="tabs"
        @click="() => saveTabsClick(PLAN_TABS_ID)"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import { LessonsPageNames } from '../../constants/lessonsConstants';
  import { PLAN_TABS_ID, PlanTabs } from '../../constants/tabsConstants';
  import { useCoachTabs } from '../../composables/useCoachTabs';

  export default {
    name: 'PlanHeader',
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();
      const { userIsMultiFacilityAdmin } = useUser();
      return {
        saveTabsClick,
        wereTabsClickedRecently,
        userIsMultiFacilityAdmin,
      };
    },
    props: {
      activeTabId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        PLAN_TABS_ID,
      };
    },
    computed: {
      ...mapGetters(['classListPageEnabled']),
      LessonsPageNames() {
        return LessonsPageNames;
      },
      tabs() {
        return [
          {
            id: PlanTabs.LESSONS,
            label: this.coreString('lessonsLabel'),
            to: this.classRoute(this.LessonsPageNames.PLAN_LESSONS_ROOT),
          },
          {
            id: PlanTabs.QUIZZES,
            label: this.coreString('quizzesLabel'),
            to: this.classRoute(PageNames.EXAMS),
          },
          {
            id: PlanTabs.GROUPS,
            label: this.coachString('groupsLabel'),
            to: this.classRoute('GroupsPage'),
          },
        ];
      },
    },
    mounted() {
      // focus the active tab but only when it's likely
      // that this header was re-mounted as a result
      // of navigation after clicking a tab (focus shouldn't
      // be manipulated programatically in other cases, e.g.
      // when visiting the Plan page for the first time)
      if (this.wereTabsClickedRecently(this.PLAN_TABS_ID)) {
        this.$nextTick(() => {
          this.$refs.tabsList.focusActiveTab();
        });
      }
    },
    $trs: {
      planYourClassLabel: {
        message: 'Plan your class',
        context: "Title of the 'Plan your class' section.",
      },
      planYourClassDescription: {
        message: 'Create and manage your lessons, quizzes, and groups',
        context: "Description of the 'Plan your class' section.",
      },
      coachPlan: {
        message: 'Coach plan',
        context: 'Labels the coach plan tab for screen reader users',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
