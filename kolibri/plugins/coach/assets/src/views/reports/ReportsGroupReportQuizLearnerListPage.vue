<template>

  <ReportsQuizBaseListPage @export="exportCSV">
    <ReportsLearnersTable :entries="table" :questionCount="exam.question_count" />
  </ReportsQuizBaseListPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsQuizBaseListPage from './ReportsQuizBaseListPage';
  import ReportsLearnersTable from './ReportsLearnersTable';

  export default {
    name: 'ReportsGroupReportQuizLearnerListPage',
    components: {
      ReportsQuizBaseListPage,
      ReportsLearnersTable,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForGroups([this.$route.params.groupId]);
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
        return this.classRoute(PageNames.REPORTS_GROUP_REPORT_QUIZ_LEARNER_PAGE_ROOT, {
          learnerId,
        });
      },
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.score(),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          group: this.group.name,
          resource: this.exam.title,
        });

        exporter.export(this.table);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

</style>
