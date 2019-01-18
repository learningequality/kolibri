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
          :to="newCoachRoute('ReportsGroupReportPage')"
          text="Group A"
        />
      </p>
      <h1>Group A</h1>
      <p>{{ $tr('lessonProgressLabel', {lesson: 'Lesson 1'}) }}</p>
      <dl>
        <dt>{{ coachStrings.$tr('statusLabel') }}</dt>
        <dd><LessonActive :active="true" /></dd>
        <dt>{{ coachStrings.$tr('descriptionLabel') }}</dt>
        <dd>Ipsum lorem</dd>
      </dl>

      <table class="new-coach-table">
        <thead>
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('avgTimeSpentLabel') }}</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <KRouterLink
                text="Some exercise"
                :to="newCoachRoute('ReportsGroupReportLessonExerciseLearnerListPage')"
              />
            </td>
            <td>
              <LearnerProgressRatio
                :count="3"
                :total="6"
                verbosity="1"
                verb="completed"
                icon="clock"
              />
            </td>
            <td><TimeDuration :seconds="360" /></td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Some video"
                :to="newCoachRoute('ReportsGroupReportLessonResourceLearnerListPage')"
              />
            </td>
            <td>
              <LearnerProgressRatio
                :count="3"
                :total="6"
                verbosity="1"
                verb="completed"
                icon="clock"
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

  import imports from './imports';

  export default {
    name: 'ReportsGroupReportLessonPage',
    components: {},
    mixins: [imports],
    computed: {
      actionOptions() {
        return [
          { label: this.coachStrings.$tr('editDetailsAction'), value: 'ReportsLessonEditorPage' },
          {
            label: this.coachStrings.$tr('manageResourcesAction'),
            value: 'ReportsLessonManagerPage',
          },
        ];
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      lessonProgressLabel: "'{lesson}' progress",
    },
  };

</script>


<style lang="scss" scoped></style>
