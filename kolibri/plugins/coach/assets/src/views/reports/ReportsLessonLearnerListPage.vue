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

      <ReportsLessonHeader />

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>

      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('groupsLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr>
            <td>
              <KRouterLink
                text="Adam"
                :to="classRoute('ReportsLessonLearnerPage', {})"
              />
            </td>
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
                text="April"
                :to="classRoute('ReportsLessonLearnerPage', {})"
              />
            </td>
            <td>
              <ItemStatusRatio
                :count="1"
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
                text="Betsy"
                :to="classRoute('ReportsLessonLearnerPage', {})"
              />
            </td>
            <td>
              <ItemStatusRatio
                :count="1"
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
                text="Edward"
                :to="classRoute('ReportsLessonLearnerPage', {})"
              />
            </td>
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
                text="John"
                :to="classRoute('ReportsLessonLearnerPage', {})"
              />
            </td>
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
          <tr>
            <td>
              <KRouterLink
                text="Julie"
                :to="classRoute('ReportsLessonLearnerPage', {})"
              />
            </td>
            <td>
              <ItemStatusCount
                :count="1"
                verbosity="1"
                obj="question"
                adjective="difficult"
                icon="help"
              />
            </td>
            <td><TruncatedItemList :items="['a', 'b', 'c', 'd']" /></td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Steve"
                :to="classRoute('ReportsLessonLearnerPage', {})"
              />
            </td>
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
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsLessonHeader from './ReportsLessonHeader';

  export default {
    name: 'ReportsLessonLearnerListPage',
    components: {
      ReportsLessonHeader,
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
