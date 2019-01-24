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
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsLearnerReportLessonPage', {})"
                    text="Some lesson"
                  />
                </td>
                <td>
                  <LearnerProgressLabel
                    :verbosity="1"
                    :count="1"
                    verb="notStarted"
                    icon="nothing"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsLearnerReportLessonPage', {})"
                    text="Another lesson"
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
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsLearnerReportLessonPage', {})"
                    text="Lesson 1"
                  />
                </td>
                <td>
                  <LearnerProgressLabel
                    :verbosity="1"
                    :count="1"
                    verb="completed"
                    icon="star"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsLearnerReportLessonPage', {})"
                    text="Lesson 2"
                  />
                </td>
                <td>
                  <LearnerProgressLabel
                    :verbosity="1"
                    :count="1"
                    verb="started"
                    icon="clock"
                  />
                </td>
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
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsLearnerReportQuizPage', {})"
                    text="Some quiz"
                  />
                </td>
                <td>
                  <LearnerProgressLabel
                    :verbosity="1"
                    :count="1"
                    verb="completed"
                    icon="star"
                  />
                </td>
                <td><Score :value="0.92" /></td>
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsLearnerReportQuizPage', {})"
                    text="Another quiz"
                  />
                </td>
                <td>
                  <LearnerProgressLabel
                    :verbosity="1"
                    :count="1"
                    verb="started"
                    icon="clock"
                  />
                </td>
                <td><Score /></td>
              </tr>
            </tbody>
          </table>
        </KGridItem>
      </KGrid>

    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsLearnerHeader from './ReportsLearnerHeader';

  export default {
    name: 'ReportsLearnerReportPage',
    components: {
      ReportsLearnerHeader,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .new-coach-table {
    min-width: 0;
  }

</style>
