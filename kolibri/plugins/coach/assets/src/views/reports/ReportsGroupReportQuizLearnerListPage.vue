<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsGroupReportQuizHeader />

      <ReportsControls @export="exportCSV" />

      <CoreTable :emptyMessage="coachString('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('nameLabel') }}</th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('scoreLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon icon="person">
                <KRouterLink
                  v-if="tableRow.statusObj.status !== STATUSES.notStarted"
                  :text="tableRow.name"
                  :to="detailLink(tableRow.id)"
                />
                <template v-else>
                  {{ tableRow.name }}
                </template>
              </KLabeledIcon>
            </td>
            <td>
              <StatusSimple :status="tableRow.statusObj.status" />
            </td>
            <td><Score :value="tableRow.statusObj.score" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsGroupReportQuizHeader from './ReportsGroupReportQuizHeader';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsGroupReportQuizLearnerListPage',
    components: {
      ReportsGroupReportQuizHeader,
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        filter: 'allQuizzes',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.coachString('allQuizzesLabel'),
            value: 'allQuizzes',
          },
          {
            label: this.coachString('activeQuizzesLabel'),
            value: 'activeQuizzes',
          },
          {
            label: this.coachString('inactiveQuizzesLabel'),
            value: 'inactiveQuizzes',
          },
        ];
      },
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
        const sorted = this._.sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getExamStatusObjForLearner(this.exam.id, learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
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
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

</style>
