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

      <ReportsLearnersTable :entries="table" />
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsLearnersTable from './ReportsLearnersTable';
  import ReportsControls from './ReportsControls';
  import ReportsResourceHeader from './ReportsResourceHeader';

  export default {
    name: 'ReportsGroupReportLessonResourceLearnerListPage',
    components: {
      CoachAppBarPage,
      ReportsControls,
      ReportsLearnersTable,
      ReportsResourceHeader,
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
        return this.getContentStatusTally(this.$route.params.resourceId, this.recipients);
      },
      table() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getContentStatusObjForLearner(
              this.$route.params.resourceId,
              learner.id,
            ),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
    },
    methods: {
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
