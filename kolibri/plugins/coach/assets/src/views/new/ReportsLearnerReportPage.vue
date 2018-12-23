<template>

  <div class="new-coach-block">

    <ReportsLearnerHeader />

    <KGrid>
      <KGridItem :sizes="[100, 100, 50]" percentage>
        <h2>{{ coachStrings.$tr('lessonsAssignedLabel') }}</h2>
        <table class="new-coach-table">
          <thead>
            <tr>
              <td>{{ coachStrings.$tr('titleLabel') }}</td>
              <td>{{ coachStrings.$tr('progressLabel') }}</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Some lesson</td>
              <td><NotStarted :showNumber="false" :verbosity="1" /></td>
            </tr>
            <tr>
              <td>Another lesson</td>
              <td><NeedHelp :showNumber="false" :verbosity="1" /></td>
            </tr>
            <tr>
              <td>Lesson 1</td>
              <td><Completed :showNumber="false" :verbosity="1" /></td>
            </tr>
            <tr>
              <td>Lesson 2</td>
              <td><InProgress :showNumber="false" :verbosity="1" /></td>
            </tr>
          </tbody>
        </table>
      </KGridItem>
      <KGridItem :sizes="[100, 100, 50]" percentage>
        <h2>{{ coachStrings.$tr('quizzesAssignedLabel') }}</h2>
        <table class="new-coach-table">
          <thead>
            <tr>
              <td>{{ coachStrings.$tr('titleLabel') }}</td>
              <td>{{ coachStrings.$tr('progressLabel') }}</td>
              <td>{{ coachStrings.$tr('scoreLabel') }}</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Some quiz</td>
              <td><Completed :showNumber="false" :verbosity="1" /></td>
              <td><Score :value="0.92" /></td>
            </tr>
            <tr>
              <td>Another quiz</td>
              <td><InProgress :showNumber="false" :verbosity="1" /></td>
              <td><Score /></td>
            </tr>
          </tbody>
        </table>
      </KGridItem>
    </KGrid>

  </div>

</template>


<script>

  import imports from './imports';
  import ReportsLearnerHeader from './ReportsLearnerHeader';

  export default {
    name: 'ReportsLearnerReportPage',
    components: {
      ReportsLearnerHeader,
    },
    mixins: [imports],
    computed: {
      link() {
        return { name: 'NEW_COACH_PAGES', params: { page: 'ReportsLearnerPage' } };
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .new-coach-table {
    min-width: 0;
  }

</style>
