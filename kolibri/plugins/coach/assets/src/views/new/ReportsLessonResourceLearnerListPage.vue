<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="{ name:'NEW_COACH_PAGES', params: {page: 'ReportsLessonPage'} }"
        :text="$tr('back', { lesson: lessonName })"
      />
    </p>
    <h1>Some Video</h1>
    <KButton :text="$tr('preview')" />
    <KCheckbox :label="$tr('viewByGroups')" />
    <h2>{{ $tr('overall') }}</h2>
    <ul>
      <li>{{ $tr('avgTimeSpent') }} <TimeDuration :seconds="360" /></li>
      <li>{{ $tr('avgNumViews') }} 4</li>
    </ul>
    <p>
      <Completed :verbosity="0" :count="3" :showRatio="false" class="stats" />
      <InProgress :verbosity="0" :count="3" :showRatio="false" class="stats" />
      <NotStarted :verbosity="0" :count="3" :showRatio="false" class="stats" />
    </p>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ $tr('tableHeaderName') }}</td>
          <td>{{ $tr('tableHeaderStatus') }}</td>
          <td>{{ $tr('tableHeaderViews') }}</td>
          <td>{{ $tr('tableHeaderTimeSpent') }}</td>
          <td>{{ $tr('tableHeaderGroups') }}</td>
          <td>{{ $tr('tableHeaderLastActivity') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>April</td>
          <td><NotStarted :showNumber="false" :verbosity="1" /></td>
          <td>23</td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td>April</td>
          <td><Completed :showNumber="false" :verbosity="1" /></td>
          <td>23</td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td>April</td>
          <td><InProgress :showNumber="false" :verbosity="1" /></td>
          <td>23</td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>Gnomes | Explorers</td>
          <td>some time ago</td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import BackLink from './shared/BackLink';
  import TimeDuration from './shared/TimeDuration';
  import InProgress from './shared/status/InProgress';
  import Completed from './shared/status/Completed';
  import NotStarted from './shared/status/NotStarted';

  export default {
    name: 'ReportsLessonResourceLearnerListPage',
    components: {
      InProgress,
      TimeDuration,
      Completed,
      NotStarted,
      BackLink,
      KCheckbox,
      KButton,
    },
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    $trs: {
      back: "Back to '{lesson}'",
      preview: 'Preview',
      overall: 'Overall',
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
