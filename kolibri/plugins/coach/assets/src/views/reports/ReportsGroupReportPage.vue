<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>

      <ReportsGroupHeader />

      <KGrid>
        <KGridItem :sizes="[100, 100, 50]" percentage>
          <h2>{{ coachStrings.$tr('lessonsAssignedLabel') }}</h2>
          <ul class="list">
            <li v-for="lesson in lessonsList" :key="lesson.id">
              <KRouterLink
                :to="classRoute('ReportsGroupReportLessonPage', { lessonId: lesson.id })"
                :text="lesson.title"
              />
            </li>
          </ul>
        </KGridItem>
        <KGridItem :sizes="[100, 100, 50]" percentage>
          <h2>{{ coachStrings.$tr('quizzesAssignedLabel') }}</h2>
          <ul class="list">
            <li v-for="exam in examsList" :key="exam.id">
              <KRouterLink
                :to="classRoute('ReportsGroupReportQuizLearnerListPage', { quizId: exam.id })"
                :text="exam.title"
              />
            </li>
          </ul>
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
        return this._.sortBy(filtered, ['title', 'active']);
      },
      examsList() {
        const filtered = this.exams.filter(exam => this.isAssigned(exam.groups));
        return this._.sortBy(filtered, ['title', 'active']);
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
    line-height: 2em;
    list-style: none;
  }

</style>
