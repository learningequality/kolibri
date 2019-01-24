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

      <ReportsLessonHeader />

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
                :to="classRoute('ReportsLessonExerciseLearnerListPage', {})"
              />
            </td>
            <td>
              <LearnerProgressRatio
                :count="2"
                :total="10"
                verbosity="1"
                verb="completed"
                icon="learners"
              />
              <LearnerProgressCount
                verb="needHelp"
                icon="help"
                :count="1"
                :verbosity="0"
              />

            </td>
            <td><TimeDuration :seconds="360" /></td>
          </tr>
          <tr>
            <td>
              <KRouterLink
                text="Some video"
                :to="classRoute('ReportsLessonResourceLearnerListPage', {})"
              />
            </td>
            <td>
              <LearnerProgressRatio
                :count="3"
                :total="6"
                verbosity="1"
                verb="completed"
                icon="learners"
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
  import ReportsLessonHeader from './ReportsLessonHeader';

  export default {
    name: 'ReportsLessonReportPage',
    components: {
      ReportsLessonHeader,
    },
    mixins: [commonCoach],
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
      back: 'All lessons',
    },
  };

</script>


<style lang="scss" scoped></style>
