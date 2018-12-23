<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="newCoachRoute('ReportsLearnerReportPage')"
        text="Julie"
      />
    </p>
    <h1>
      {{ coachStrings.$tr('combinedLabel', {firstItem: 'Julie', secondItem: 'Some lesson'}) }}
    </h1>
    <dl>
      <dt>{{ coachStrings.$tr('statusLabel') }}</dt>
      <dd><LessonActive :active="true" /></dd>
      <dt>{{ coachStrings.$tr('recipientsLabel') }}</dt>
      <dd>Group 1, Group 2</dd>
      <dt>{{ coachStrings.$tr('descriptionLabel') }}</dt>
      <dd>Ipsum lorem</dd>
    </dl>

    <h2>{{ coachStrings.$tr('numberOfResources', {value: 4}) }}</h2>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ coachStrings.$tr('titleLabel') }}</td>
          <td>{{ coachStrings.$tr('progressLabel') }}</td>
          <td>{{ coachStrings.$tr('timeSpentLabel') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <KRouterLink
              text="Some exercise"
              :to="newCoachRoute('ReportsLearnerReportLessonExercisePage')"
            />
          </td>
          <td>
            <NeedHelp :showNumber="false" :verbosity="1" />
          </td>
          <td><TimeDuration :seconds="360" /></td>
        </tr>
        <tr>
          <td>
            Some video
          </td>
          <td>
            <Completed :showNumber="false" :verbosity="1" />
          </td>
          <td><TimeDuration :seconds="120" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsLearnerReportLessonPage',
    components: {},
    mixins: [imports],
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
    },
  };

</script>


<style lang="scss" scoped></style>
