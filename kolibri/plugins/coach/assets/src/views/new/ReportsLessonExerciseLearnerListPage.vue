<template>

  <div class="new-coach-block">

    <ReportsLessonExerciseHeader />

    <h2>{{ $tr('overall') }}</h2>
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
          <td>{{ $tr('tableHeaderStatus') }}</td>
          <td>{{ $tr('tableHeaderTimeSpent') }}</td>
          <td>{{ $tr('tableHeaderGroups') }}</td>
          <td>{{ $tr('tableHeaderLastActivity') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><KRouterLink text="April" :to="userLink" /></td>
          <td><NotStarted :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td><KRouterLink text="John" :to="userLink" /></td>
          <td><Completed :showNumber="false" :verbosity="1" /></td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td><KRouterLink text="Steve" :to="userLink" /></td>
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

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import TimeDuration from './shared/TimeDuration';
  import InProgress from './shared/status/InProgress';
  import Completed from './shared/status/Completed';
  import NotStarted from './shared/status/NotStarted';
  import NeedHelp from './shared/status/NeedHelp';
  import ReportsLessonExerciseHeader from './ReportsLessonExerciseHeader';

  export default {
    name: 'ReportsLessonExerciseLearnerListPage',
    components: {
      InProgress,
      TimeDuration,
      Completed,
      NeedHelp,
      NotStarted,
      ReportsLessonExerciseHeader,
      KRouterLink,
    },
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    computed: {
      userLink() {
        return {
          name: 'NEW_COACH_PAGES',
          params: { page: 'ReportsExerciseClassReportIndividual' },
        };
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      back: "Back to '{lesson}'",
      preview: 'Preview',
      overall: 'Overall',
      report: 'Learner report',
      difficulties: 'Question difficulties',
      avgTimeSpent: 'Average time spent:',
      avgNumViews: 'Average number of views:',
      viewByGroups: 'View report by groups',
      tableHeaderName: 'Name',
      tableHeaderStatus: 'Status',
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
