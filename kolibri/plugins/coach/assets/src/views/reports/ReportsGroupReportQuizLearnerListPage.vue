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

      <CoreTable :emptyMessage="common$tr('activityListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ common$tr('nameLabel') }}</th>
            <th>{{ common$tr('progressLabel') }}</th>
            <th>{{ common$tr('scoreLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" person />
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

  import commonCoach from '../common';
  import { PageNames } from '../../constants';
  import ReportsGroupReportQuizHeader from './ReportsGroupReportQuizHeader';

  export default {
    name: 'ReportsGroupReportQuizLearnerListPage',
    components: {
      ReportsGroupReportQuizHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        filter: 'allQuizzes',
      };
    },
    computed: {
      filterOptions() {
        return [
          {
            label: this.$tr('allQuizzes'),
            value: 'allQuizzes',
          },
          {
            label: this.$tr('activeQuizzes'),
            value: 'activeQuizzes',
          },
          {
            label: this.$tr('inactiveQuizzes'),
            value: 'inactiveQuizzes',
          },
        ];
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
    },
    $trs: {
      averageScore: 'Average score: {score, number, percent}',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
