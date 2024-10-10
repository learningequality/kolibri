<template>

  <CoachAppBarPage>
    <KPageContainer>
      <ReportsResourceHeader
        :resource="resource"
        @previewClick="onPreviewClick"
      />

      <ReportsControls @export="exportCSV">
        <p>
          <StatusSummary :tally="tally" />
        </p>
      </ReportsControls>

      <ReportsLearnersTable
        :entries="table"
        :questionCount="
          resource.assessmentmetadata && resource.assessmentmetadata.number_of_assessments
        "
      />
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import { PageNames } from '../../constants';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsResourceHeader from './ReportsResourceHeader';
  import ReportsControls from './ReportsControls';
  import ReportsLearnersTable from './ReportsLearnersTable';

  export default {
    name: 'ReportsGroupReportLessonExerciseLearnerListPage',
    components: {
      CoachAppBarPage,
      ReportsResourceHeader,
      ReportsControls,
      ReportsLearnersTable,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      ...mapState('resourceDetail', ['resource']),
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      recipients() {
        return this.getLearnersForGroups([this.$route.params.groupId]);
      },
      tally() {
        return this.getContentStatusTally(this.$route.params.exerciseId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = sortBy(learners, ['name']);
        return sorted.map(learner => {
          const groups = this.getGroupNamesForLearner(learner.id);
          const tableRow = {
            groups,
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.exerciseId,
              learner.id,
            ),
            link: this.link(learner.id),
          };

          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
    },
    methods: {
      link(learnerId) {
        return this.classRoute(PageNames.REPORTS_GROUP_REPORT_LESSON_EXERCISE_LEARNER_PAGE_ROOT, {
          learnerId,
        });
      },
      exportCSV() {
        const columns = [
          ...csvFields.name(),
          ...csvFields.learnerProgress('statusObj.status'),
          ...csvFields.timeSpent('statusObj.time_spent'),
          ...csvFields.list('groups', 'groupsLabel'),
          ...csvFields.lastActivity('statusObj.last_activity'),
        ];

        const exporter = new CSVExporter(columns, this.className);
        exporter.addNames({
          group: this.group.name,
          lesson: this.lesson.title,
          resource: this.resource.title,
        });

        exporter.export(this.table);
      },
      onPreviewClick() {
        this.$router.push(
          this.$router.getRoute(
            'RESOURCE_CONTENT_PREVIEW',
            {
              contentId: this.resource.id,
            },
            this.defaultBackLinkQuery,
          ),
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .stats {
    margin-right: 16px;
  }

</style>
