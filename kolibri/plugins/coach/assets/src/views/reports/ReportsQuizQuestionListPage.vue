<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsQuizHeader />

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('questionLabel') }}</td>
            <td>{{ coachStrings.$tr('helpNeededLabel') }}</td>
            <td>{{ $tr('avgTimeSpentLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr>
            <td><KRouterLink text="Question 1" :to="questionLink" /></td>
            <td>
              <LearnerProgressCount
                :count="12"
                :verbosity="1"
                icon="help"
                verb="needHelp"
              />
            </td>
            <td><TimeDuration :seconds="60*15" /></td>
          </tr>
          <tr>
            <td><KRouterLink text="Question 2" :to="questionLink" /></td>
            <td>
              <LearnerProgressCount
                :count="1"
                :verbosity="1"
                icon="help"
                verb="needHelp"
              />
            </td>
            <td><TimeDuration :seconds="60*4" /></td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsQuizHeader from './ReportsQuizHeader';

  export default {
    name: 'ReportsQuizQuestionListPage',
    components: {
      ReportsQuizHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      questionLink() {
        return this.classRoute('ReportsQuizQuestionPage', {});
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      avgTimeSpentLabel: 'Average time spent',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
