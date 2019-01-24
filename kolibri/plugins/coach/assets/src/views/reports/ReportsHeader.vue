<template>

  <div>
    <p>
      <BackLink
        :to="$router.getRoute('CoachClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ coachStrings.$tr('reportsLabel') }}</h1>
    <p>{{ $tr('description') }}</p>
    <div>
      <KRouterLink
        :text="coachStrings.$tr('lessonsLabel')"
        :to="classRoute('ReportsLessonListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('quizzesLabel')"
        :to="classRoute('ReportsQuizListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('groupsLabel')"
        :to="classRoute('ReportsGroupListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('learnersLabel')"
        :to="classRoute('ReportsLearnerListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
    </div>
    <hr>
  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsHeader',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: 'All classes',
      description: 'View reports for your learners and class materials',
    },
  };

</script>


<style lang="scss" scoped></style>
