<template>

  <div class="new-coach-block">

    <ReportsLessonExerciseHeader />

    <KCheckbox :label="coachStrings.$tr('viewByGroupsToggle')" />

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
          <td>{{ $tr('tableHeaderName') }}</td>
          <td>{{ $tr('tableHeaderProgress') }}</td>
          <td>{{ $tr('tableHeaderTimeSpent') }}</td>
          <td>{{ $tr('tableHeaderGroups') }}</td>
          <td>{{ $tr('tableHeaderLastActivity') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><KRouterLink text="April" :to="learnerLink" /></td>
          <td><NotStarted :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td><KRouterLink text="John" :to="learnerLink" /></td>
          <td><Completed :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td><KRouterLink text="Steve" :to="learnerLink" /></td>
          <td><NeedHelp :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';

  export default {
    name: 'ReportsLessonExerciseLearnerListPage',
    components: {
      ReportsLessonExerciseHeader,
    },
    mixins: [imports],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      learnerLink() {
        return {
          name: 'NEW_COACH_PAGES',
          params: { page: 'ReportsLessonExerciseLearnerPage' },
        };
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      tableHeaderName: 'Name',
      tableHeaderProgress: 'Progress',
      tableHeaderViews: 'Views',
      tableHeaderTimeSpent: 'Time spent',
      tableHeaderGroups: 'Groups',
      tableHeaderLastActivity: 'Last activity',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
