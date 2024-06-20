<template>

  <ReportsQuizBaseListPage
    :activeTabId="QuizzesTabs.REPORT"
    @export="exportCSV"
  >
    <KTabsPanel
      :tabsId="QUIZZES_TABS_ID"
      :activeTabId="QuizzesTabs.REPORT"
    >
      <ReportsLearnersTable
        :entries="table"
        :questionCount="exam.question_count"
      />
    </KTabsPanel>
  </ReportsQuizBaseListPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../../constants';
  import commonCoach from '../common';
  import { QUIZZES_TABS_ID, QuizzesTabs } from '../../constants/tabsConstants';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsQuizBaseListPage from './ReportsQuizBaseListPage';
  import ReportsLearnersTable from './ReportsLearnersTable';

  export default {
    name: 'ReportsQuizLearnerListPage',
    components: {
      ReportsQuizBaseListPage,
      ReportsLearnersTable,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        QUIZZES_TABS_ID,
        QuizzesTabs,
      };
    },
    computed: {
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForExam(this.exam);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getExamStatusObjForLearner(this.exam.id, learner.id),
            link: this.detailLink(learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
    },
    methods: {
      detailLink(learnerId) {
        return this.classRoute(PageNames.REPORTS_QUIZ_LEARNER_PAGE_ROOT, {
          learnerId,
        });
      },
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.score(),
          ...csvFields.quizQuestionsAnswered(this.exam),
          ...csvFields.list('groups', 'groupsLabel'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          resource: this.exam.title,
        });

        exporter.export(this.table);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .small-answered-count {
    display: block;
    margin-left: 1.75rem; /* matches KLabeledIcon */
    font-size: small;
  }

</style>
