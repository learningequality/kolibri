<template>

  <div>
    <p><BackLink :to="{ name:'CLASS_LIST' }" :text="$tr('back')" /></p>
    <h1>{{ $tr('reports') }}</h1>
    <p>View reports for your class materials and learners</p>
    <div>
      <KRouterLink
        :text="$tr('lessons')"
        :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsLessonListPage' }}"
        :primary="false"
        appearance="flat-button"
      />
      <KRouterLink
        :text="$tr('quizzes')"
        :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizListPage' }}"
        :primary="false"
        appearance="flat-button"
      />
      <KRouterLink
        :text="$tr('learners')"
        :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsLearnersList' }}"
        :primary="false"
        appearance="flat-button"
      />
      <KRouterLink
        :text="$tr('groups')"
        :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsGroupsList' }}"
        :primary="false"
        appearance="flat-button"
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
      back: 'View all classes',
      reports: 'Reports',
      lessons: 'Lessons',
      quizzes: 'Quizzes',
      learners: 'Learners',
      groups: 'Groups',
    },
  };

</script>


<style lang="scss" scoped></style>
