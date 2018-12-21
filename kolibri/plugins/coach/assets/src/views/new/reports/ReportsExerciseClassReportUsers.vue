<template>

  <div class="new-coach-block">

    <ReportsExerciseClassReportHeader />

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
  import InProgress from '../Status/InProgress';
  import TimeDuration from '../TimeDuration';
  import Completed from '../Status/Completed';
  import NotStarted from '../Status/NotStarted';
  import NeedHelp from '../Status/NeedHelp';
  import ReportsExerciseClassReportHeader from './ReportsExerciseClassReportHeader';

  export default {
    name: 'ReportsExerciseClassReportUsers',
    components: {
      InProgress,
      TimeDuration,
      Completed,
      NeedHelp,
      NotStarted,
      ReportsExerciseClassReportHeader,
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
