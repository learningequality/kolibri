<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled || userIsMultiFacilityAdmin"
        :to="$router.getRoute('HomePage')"
        :text="coreString('classHome')"
      />
    </p>
    <h1>{{ reportTitle }}</h1>
    <p v-show="!$isPrint">
      {{ $tr('description') }}
    </p>
    <HeaderTabs :style="{ marginTop: '28px' }">
      <KTabsList
        ref="tabsList"
        :tabsId="REPORTS_TABS_ID"
        :ariaLabel="$tr('coachReports')"
        :activeTabId="activeTabId"
        :tabs="tabs"
        :style="{ position: 'relative', top: '5px' }"
        @click="() => saveTabsClick(REPORTS_TABS_ID)"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { REPORTS_TABS_ID, ReportsTabs } from '../../constants/tabsConstants';
  import { useCoachTabs } from '../../composables/useCoachTabs';

  export default {
    name: 'ReportsHeader',
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();
      return {
        saveTabsClick,
        wereTabsClickedRecently,
      };
    },
    props: {
      title: {
        type: String,
        default: null,
      },
      activeTabId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        REPORTS_TABS_ID,
      };
    },
    computed: {
      ...mapGetters(['classListPageEnabled', 'userIsMultiFacilityAdmin']),
      reportTitle() {
        return this.title || this.coachString('reportsLabel');
      },
      tabs() {
        return [
          {
            id: ReportsTabs.LESSONS,
            label: this.coreString('lessonsLabel'),
            to: this.classRoute('ReportsLessonListPage'),
          },
          {
            id: ReportsTabs.QUIZZES,
            label: this.coreString('quizzesLabel'),
            to: this.classRoute('ReportsQuizListPage'),
          },
          {
            id: ReportsTabs.GROUPS,
            label: this.coachString('groupsLabel'),
            to: this.classRoute('ReportsGroupListPage'),
          },
          {
            id: ReportsTabs.LEARNERS,
            label: this.coreString('learnersLabel'),
            to: this.classRoute('ReportsLearnerListPage'),
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
      if (this.wereTabsClickedRecently(this.REPORTS_TABS_ID)) {
        this.$nextTick(() => {
          this.$refs.tabsList.focusActiveTab();
        });
      }
    },
    $trs: {
      description: {
        message: 'View reports for your learners and class materials',
        context: "Description for the 'Reports' section.",
      },
      coachReports: {
        message: 'Coach reports',
        context: 'Labels the coach reports for screen reader users',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
