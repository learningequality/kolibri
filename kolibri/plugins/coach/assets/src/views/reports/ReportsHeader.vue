<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled"
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
        :tabsId="REPORTS_TABS_ID"
        ariaLabel="Coach reports"
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
  import { REPORTS_TABS_ID, ReportsTabs } from '../../constants/tabsConstants';

  export default {
    name: 'ReportsHeader',
    mixins: [commonCoach, commonCoreStrings],
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
      ...mapGetters(['classListPageEnabled']),
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
    $trs: {
      description: {
        message: 'View reports for your learners and class materials',
        context: "Description for the 'Reports' section.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
