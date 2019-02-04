<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">

      <ReportsGroupLearnerHeader />

      <KGrid>
        <KGridItem :sizes="[100, 100, 50]" percentage>
          <h2>{{ coachStrings.$tr('lessonsAssignedLabel') }}</h2>
          <CoreTable>
            <thead slot="thead">
              <tr>
                <td>{{ coachStrings.$tr('titleLabel') }}</td>
                <td>{{ coachStrings.$tr('progressLabel') }}</td>
              </tr>
            </thead>
            <transition-group slot="tbody" tag="tbody" name="list">
              <tr>
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsGroupLearnerReportLessonPage', { lessonId: '___' })"
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
                    :to="classRoute('ReportsGroupLearnerReportLessonPage', { lessonId: '___' })"
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
                    :to="classRoute('ReportsGroupLearnerReportLessonPage', { lessonId: '___' })"
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
                    :to="classRoute('ReportsGroupLearnerReportLessonPage', { lessonId: '___' })"
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
            </transition-group>
          </CoreTable>
        </KGridItem>
        <KGridItem :sizes="[100, 100, 50]" percentage>
          <h2>{{ coachStrings.$tr('quizzesAssignedLabel') }}</h2>
          <CoreTable>
            <thead slot="thead">
              <tr>
                <td>{{ coachStrings.$tr('titleLabel') }}</td>
                <td>{{ coachStrings.$tr('progressLabel') }}</td>
                <td>{{ coachStrings.$tr('scoreLabel') }}</td>
              </tr>
            </thead>
            <transition-group slot="tbody" tag="tbody" name="list">
              <tr>
                <td>
                  <KRouterLink
                    :to="classRoute('ReportsGroupLearnerReportQuizPage', {})"
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
                    :to="classRoute('ReportsGroupLearnerReportQuizPage', {})"
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
            </transition-group>
          </CoreTable>
        </KGridItem>
      </KGrid>

    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import ReportsGroupLearnerHeader from './ReportsGroupLearnerHeader';

  export default {
    name: 'ReportsGroupLearnerReportPage',
    components: {
      ReportsGroupLearnerHeader,
    },
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  table {
    min-width: 0;
  }

</style>
