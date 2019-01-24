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
      <p>
        <BackLink
          :to="classRoute('ReportsLearnerReportPage', {})"
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
                :to="classRoute('ReportsLearnerReportLessonExercisePage', {})"
              />
            </td>
            <td>
              <LearnerProgressLabel
                :verbosity="1"
                :count="1"
                verb="needHelp"
                icon="help"
              />
            </td>
            <td><TimeDuration :seconds="360" /></td>
          </tr>
          <tr>
            <td>
              Some video
            </td>
            <td>
              <LearnerProgressLabel
                :verbosity="1"
                :count="1"
                verb="completed"
                icon="star"
              />
            </td>
            <td><TimeDuration :seconds="120" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsLearnerReportLessonPage',
    components: {},
    mixins: [commonCoach],
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
    },
  };

</script>


<style lang="scss" scoped></style>
