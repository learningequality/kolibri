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
      <ReportsHeader />
      <KSelect
        v-model="filter"
        :label="$tr('show')"
        :options="filterOptions"
        :inline="true"
      />
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('avgScoreLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('recipientsLabel') }}</td>
            <td>{{ coachStrings.$tr('statusLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr>
            <td>
              <KRouterLink
                text="Another quiz"
                :to="classRoute('ReportsQuizLearnerListPage', {})"
              />
            </td>
            <td><Score /></td>
            <td>
              <LearnerProgressRatio
                :count="0"
                :verbosity="1"
                icon="nothing"
                :total="10"
                verb="started"
              />
            </td>
            <td><Recipients :groups="['a', 'b']" /></td>
            <td>
              <QuizActive :active="false" />
            </td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Quiz A"
                :to="classRoute('ReportsQuizLearnerListPage', {})"
              />
            </td>
            <td><Score /></td>
            <td>
              <LearnerProgressRatio
                verb="started"
                :count="8"
                :verbosity="1"
                icon="clock"
                :total="10"
              />
            </td>
            <td><Recipients :groups="['a', 'b']" /></td>
            <td>
              <QuizActive :active="true" />
            </td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Quiz B"
                :to="classRoute('ReportsQuizLearnerListPage', {})"
              />
            </td>
            <td><Score :value="0.9" /></td>
            <td>
              <LearnerProgressRatio
                verb="completed"
                :count="10"
                :verbosity="1"
                icon="star"
                :total="10"
              />
            </td>
            <td><Recipients :groups="[]" /></td>
            <td>
              <QuizActive :active="true" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsQuizListPage',
    components: {
      ReportsHeader,
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
      show: 'Show',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
