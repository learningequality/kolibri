<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="$router.getRoute('HomePage')"
        :text="coreString('classHome')"
      />
    </p>
    <h1>{{ $tr('planYourClassLabel') }}</h1>
    <p>{{ $tr('planYourClassDescription') }}</p>
    <HeaderTabs :style="{ marginTop: '28px' }">
      <KTabsList
        :tabsId="PLAN_TABS_ID"
        ariaLabel="Coach plan"
        :activeTabId="activeTabId"
        :tabs="tabs"
        :style="{ position: 'relative', top: '5px' }"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import { LessonsPageNames } from '../../constants/lessonsConstants';
  import { PLAN_TABS_ID, PlanTabs } from '../../constants/tabsConstants';

  export default {
    name: 'PlanHeader',
    mixins: [commonCoach, commonCoreStrings],
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
    $trs: {
      planYourClassLabel: {
        message: 'Plan your class',
        context: "Title of the 'Plan your class' section.",
      },
      planYourClassDescription: {
        message: 'Create and manage your lessons, quizzes, and groups',
        context: "Description of the 'Plan your class' section.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
