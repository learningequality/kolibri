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

      <ReportsGroupReportLessonExerciseHeader />

      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
      <p>
        <LearnerProgressCount
          :count="1"
          verbosity="0"
          verb="completed"
          icon="star"
        />
        <LearnerProgressCount
          :count="3"
          verbosity="0"
          verb="started"
          icon="clock"
        />
        <LearnerProgressCount
          :count="2"
          verbosity="0"
          verb="needHelp"
          icon="help"
        />
        <LearnerProgressCount
          :count="1"
          verbosity="0"
          verb="notStarted"
          icon="nothing"
        />
      </p>
      <table class="new-coach-table">
        <thead>
          <tr>
            <td>{{ coachStrings.$tr('nameLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('timeSpentLabel') }}</td>
            <td>{{ coachStrings.$tr('lastActivityLabel') }}</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><KRouterLink text="April" :to="learnerLink" /></td>
            <td>
              <LearnerProgressLabel
                :count="1"
                :verbosity="1"
                verb="completed"
                icon="star"
              />
            </td>
            <td><TimeDuration :seconds="60*15" /></td>
            <td>some time ago</td>
          </tr>
          <tr>
            <td><KRouterLink text="John" :to="learnerLink" /></td>
            <td>
              <LearnerProgressLabel
                :count="1"
                :verbosity="1"
                verb="notStarted"
                icon="nothing"
              />
            </td>
            <td><TimeDuration :seconds="60*15" /></td>
            <td>some time ago</td>
          </tr>
          <tr>
            <td><KRouterLink text="Steve" :to="learnerLink" /></td>
            <td>
              <LearnerProgressLabel
                :count="1"
                :verbosity="1"
                verb="needHelp"
                icon="help"
              />
            </td>
            <td><TimeDuration :seconds="60*15" /></td>
            <td>some time ago</td>
          </tr>
        </tbody>
      </table>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsGroupReportLessonExerciseHeader from './ReportsGroupReportLessonExerciseHeader';

  export default {
    name: 'ReportsGroupReportLessonExerciseLearnerListPage',
    components: {
      ReportsGroupReportLessonExerciseHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      learnerLink() {
        return this.newCoachRoute('ReportsGroupReportLessonExerciseLearnerPage');
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
