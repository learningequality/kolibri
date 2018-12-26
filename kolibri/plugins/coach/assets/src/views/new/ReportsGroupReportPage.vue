<template>

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
                <Completed
                  :count="8"
                  :showRatio="false"
                  :verbosity="1"
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
                <Completed
                  :count="6"
                  :showRatio="false"
                  :verbosity="1"
                />
                <NeedHelp
                  :count="2"
                  :showRatio="false"
                  :verbosity="0"
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
                <Completed
                  :count="2"
                  :showRatio="false"
                  :verbosity="1"
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
                <Completed
                  :count="2"
                  :showRatio="false"
                  :verbosity="1"
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
                <Completed
                  :count="2"
                  :showRatio="false"
                  :verbosity="1"
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
                <Completed
                  :count="2"
                  :showRatio="false"
                  :verbosity="1"
                />
              </td>
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
  import ReportsGroupHeader from './ReportsGroupHeader';

  export default {
    name: 'ReportsGroupReportPage',
    components: {
      ReportsGroupHeader,
    },
    mixins: [imports],
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
