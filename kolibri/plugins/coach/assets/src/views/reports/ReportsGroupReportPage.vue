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

      <ReportsGroupHeader />

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
                    :to="newCoachRoute('ReportsGroupReportLessonPage')"
                    text="Some lesson"
                  />
                </td>
                <td>
                  <LearnerProgressCount
                    :count="8"
                    :verbosity="1"
                    icon="clock"
                    verb="completed"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="newCoachRoute('ReportsGroupReportLessonPage')"
                    text="Another lesson"
                  />
                </td>
                <td>
                  <LearnerProgressRatio
                    :count="10"
                    :total="10"
                    :verbosity="1"
                    icon="star"
                    verb="completed"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="newCoachRoute('ReportsGroupReportLessonPage')"
                    text="Lesson 1"
                  />
                </td>
                <td>
                  <LearnerProgressCount
                    :count="2"
                    :verbosity="1"
                    icon="clock"
                    verb="completed"
                  />
                  <LearnerProgressCount
                    :count="2"
                    :verbosity="0"
                    icon="help"
                    verb="needHelp"
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="newCoachRoute('ReportsGroupReportLessonPage')"
                    text="Lesson 2"
                  />
                </td>
                <td>
                  <LearnerProgressCount
                    :count="2"
                    :verbosity="1"
                    icon="clock"
                    verb="completed"
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
                <td>{{ coachStrings.$tr('avgScoreLabel') }}</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <KRouterLink
                    :to="newCoachRoute('ReportsGroupReportQuizLearnerListPage')"
                    text="Some quiz"
                  />
                </td>
                <td>
                  <LearnerProgressCount
                    :count="2"
                    :verbosity="1"
                    icon="clock"
                    verb="completed"
                  />
                </td>
                <td><Score :value="0.92" /></td>
              </tr>
              <tr>
                <td>
                  <KRouterLink
                    :to="newCoachRoute('ReportsGroupReportQuizLearnerListPage')"
                    text="Another quiz"
                  />
                </td>
                <td>
                  <LearnerProgressRatio
                    :count="0"
                    :total="10"
                    :verbosity="1"
                    icon="nothing"
                    verb="started"
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
  import ReportsGroupHeader from './ReportsGroupHeader';

  export default {
    name: 'ReportsGroupReportPage',
    components: {
      ReportsGroupHeader,
    },
    mixins: [commonCoach],
    computed: {
      link() {
        return this.newCoachRoute('ReportsLearnerPage');
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
