<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="newCoachRoute('ReportsGroupReportLessonPage')"
        :text="$tr('back', { lesson: 'Lesson 1' })"
      />
    </p>
    <h1>Some Video</h1>

    <KButton :text="coachStrings.$tr('previewAction')" />

    <dl>
      <dt>{{ coachStrings.$tr('avgTimeSpentLabel') }}</dt>
      <dd><TimeDuration :seconds="360" /></dd>
      <dt>{{ $tr('avgNumViews') }}</dt>
      <dd>{{ coachStrings.$tr('integer', {value: 3}) }}</dd>
    </dl>

    <p>
      <Completed :verbosity="0" :count="3" :showRatio="false" class="stats" />
      <InProgress :verbosity="0" :count="3" :showRatio="false" class="stats" />
      <NotStarted :verbosity="0" :count="3" :showRatio="false" class="stats" />
    </p>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ coachStrings.$tr('nameLabel') }}</td>
          <td>{{ coachStrings.$tr('statusLabel') }}</td>
          <td>{{ coachStrings.$tr('viewsLabel') }}</td>
          <td>{{ coachStrings.$tr('timeSpentLabel') }}</td>
          <td>{{ coachStrings.$tr('lastActivityLabel') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>April</td>
          <td><NotStarted :showNumber="false" :verbosity="1" /></td>
          <td>23</td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td>John</td>
          <td><Completed :showNumber="false" :verbosity="1" /></td>
          <td>23</td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>some time ago</td>
        </tr>
        <tr>
          <td>Steve</td>
          <td><InProgress :showNumber="false" :verbosity="1" /></td>
          <td>23</td>
          <td><TimeDuration :seconds="60*15" /></td>
          <td>some time ago</td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsGroupReportLessonResourceLearnerListPage',
    components: {},
    mixins: [imports],
    $trs: {
      back: "Back to '{lesson}'",
      avgNumViews: 'Average number of views',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
