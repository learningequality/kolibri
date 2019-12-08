<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsGroupHeader />

      <KGrid>
        <KGridItem :layout12="{ span: 6 }">
          <h2>{{ coachString('lessonsAssignedLabel') }}</h2>
          <ul class="list">
            <li v-for="lesson in lessonsList" :key="lesson.id">
              <KLabeledIcon icon="lesson">
                <KRouterLink
                  :to="classRoute('ReportsGroupReportLessonPage', { lessonId: lesson.id })"
                  :text="lesson.title"
                />
              </KLabeledIcon>
            </li>
          </ul>
          <p v-if="lessonsList.length === 0">
            {{ coachString('lessonListEmptyState') }}
          </p>
        </KGridItem>
        <KGridItem :layout12="{ span: 6 }">
          <h2>{{ coachString('quizzesAssignedLabel') }}</h2>
          <ul class="list">
            <li v-for="exam in examsList" :key="exam.id">
              <KLabeledIcon icon="quiz">
                <KRouterLink
                  :to="classRoute('ReportsGroupReportQuizLearnerListPage', { quizId: exam.id })"
                  :text="exam.title"
                />
              </KLabeledIcon>
            </li>
          </ul>
          <p v-if="examsList.length === 0">
            {{ coachString('quizListEmptyState') }}
          </p>
        </KGridItem>
      </KGrid>

    </KPageContainer>
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
      lessonsList() {
        const filtered = this.lessons.filter(lesson => this.isAssigned(lesson.groups));
        return this._.orderBy(filtered, ['date_created'], ['desc']);
      },
      examsList() {
        const filtered = this.exams.filter(exam => this.isAssigned(exam.groups));
        return this._.orderBy(filtered, ['date_created'], ['desc']);
      },
    },
    methods: {
      isAssigned(groups) {
        return groups.includes(this.$route.params.groupId) || !groups.length;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .list {
    padding: 0;
    margin: 0;
    font-size: 14px;
    line-height: 2em;
    list-style: none;

    @media print {
      a.link {
        text-decoration: none;
      }
    }
  }

</style>
