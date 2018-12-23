<template>

  <div>
    <p>
      <BackLink
        :to="newCoachRoute('ClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ $tr('reports') }}</h1>
    <p>{{ $tr('description') }}</p>
    <div>
      <KRouterLink
        :text="$tr('lessons')"
        :to="newCoachRoute('ReportsLessonListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="$tr('quizzes')"
        :to="newCoachRoute('ReportsQuizListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="$tr('learners')"
        :to="newCoachRoute('ReportsLearnerListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="$tr('groups')"
        :to="newCoachRoute('ReportsGroupListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
    </div>
    <hr>
  </div>

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import BackLink from './shared/BackLink';

  export default {
    name: 'ReportsHeader',
    components: {
      KRouterLink,
      BackLink,
    },
    $trs: {
      back: 'All classes',
      description: 'View reports for your learners and class materials',
      reports: 'Reports',
      lessons: 'Lessons',
      quizzes: 'Quizzes',
      learners: 'Learners',
      groups: 'Groups',
    },
  };

</script>


<style lang="scss" scoped></style>
