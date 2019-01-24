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

      <ReportsQuizHeader />

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
      <p>{{ $tr('averageScore', {score: 0.6}) }}</p>

      <table class="new-coach-table">
        <thead>
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('scoreLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('groupsLabel') }}</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <KRouterLink
                text="April"
                :to="classRoute('ReportsQuizLearnerPage', {})"
              />
            </td>
            <td><Score /></td>
            <td>
              <ItemStatusRatio
                :count="0"
                :total="10"
                verbosity="1"
                obj="question"
                adjective="completed"
                icon="clock"
              />
            </td>
            <td><TruncatedItemList :items="[]" /></td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Steve"
                :to="classRoute('ReportsQuizLearnerPage', {})"
              />
            </td>
            <td><Score /></td>
            <td>
              <ItemStatusRatio
                :count="8"
                :total="10"
                verbosity="1"
                obj="question"
                adjective="completed"
                icon="clock"
              />
            </td>
            <td><TruncatedItemList :items="['a', 'b']" /></td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="John"
                :to="classRoute('ReportsQuizLearnerPage', {})"
              />
            </td>
            <td><Score :value="0.1" /></td>
            <td>
              <ItemStatusRatio
                :count="10"
                :total="10"
                verbosity="1"
                obj="question"
                adjective="completed"
                icon="star"
              />
            </td>
            <td><TruncatedItemList :items="['a', 'b', 'c', 'd']" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsQuizHeader from './ReportsQuizHeader';

  export default {
    name: 'ReportsQuizLearnerListPage',
    components: {
      ReportsQuizHeader,
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
