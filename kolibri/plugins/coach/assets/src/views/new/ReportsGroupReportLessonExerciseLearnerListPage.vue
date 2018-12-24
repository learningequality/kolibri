<template>

  <div class="new-coach-block">

    <ReportsGroupReportLessonExerciseHeader />

    <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
    <p>
      <Completed :verbosity="0" :count="3" :showRatio="false" class="stats" />
      <InProgress :verbosity="0" :count="3" :showRatio="false" class="stats" />
      <NeedHelp :verbosity="0" :count="3" :showRatio="false" class="stats" />
      <NotStarted :verbosity="0" :count="3" :showRatio="false" class="stats" />
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
          <td><NotStarted :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td><KRouterLink text="John" :to="learnerLink" /></td>
          <td><Completed :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td><KRouterLink text="Steve" :to="learnerLink" /></td>
          <td><NeedHelp :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>some time ago</td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsGroupReportLessonExerciseHeader from './ReportsGroupReportLessonExerciseHeader';

  export default {
    name: 'ReportsGroupReportLessonExerciseLearnerListPage',
    components: {
      ReportsGroupReportLessonExerciseHeader,
    },
    mixins: [imports],
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
