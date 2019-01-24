<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">

      <ReportsGroupReportQuizHeader />

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
      <p>{{ $tr('averageScore', {score: 0.6}) }}</p>

      <table class="new-coach-table">
        <thead>
          <tr>
            <td>{{ coachStrings.$tr('nameLabel') }}</td>
            <td>{{ coachStrings.$tr('scoreLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <KRouterLink
                text="April"
                :to="classRoute('ReportsGroupReportQuizLearnerPage', {})"
              />
            </td>
            <td><Score /></td>
            <td>
              <LearnerProgressLabel
                :count="0"
                verbosity="1"
                icon="nothing"
                verb="notStarted"
              />
            </td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Steve"
                :to="classRoute('ReportsGroupReportQuizLearnerPage', {})"
              />
            </td>
            <td><Score /></td>
            <td>
              <LearnerProgressLabel
                :count="8"
                verbosity="1"
                icon="clock"
                verb="started"
              />
            </td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="John"
                :to="classRoute('ReportsGroupReportQuizLearnerPage', {})"
              />
            </td>
            <td><Score :value="0.1" /></td>
            <td>
              <LearnerProgressLabel
                :count="10"
                verbosity="1"
                icon="star"
                verb="completed"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
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
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
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
