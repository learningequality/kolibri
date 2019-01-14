<template>

  <div>
    <p>
      <BackLink
        :to="route(PageNames.COACH_CLASS_LIST)"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ coachStrings.$tr('reportsLabel') }}</h1>
    <p>{{ $tr('description') }}</p>
    <div>
      <KRouterLink
        :text="coachStrings.$tr('lessonsLabel')"
        :to="classRoute(PageNames.ReportsLessonListPage)"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('quizzesLabel')"
        :to="classRoute(PageNames.ReportsQuizListPage)"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('groupsLabel')"
        :to="classRoute(PageNames.ReportsGroupListPage)"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('learnersLabel')"
        :to="classRoute(PageNames.ReportsLearnerListPage)"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
    </div>
    <hr>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsHeader',
    components: {},
    mixins: [imports],
    $trs: {
      back: 'All classes',
      description: 'View reports for your learners and class materials',
    },
  };

</script>


<style lang="scss" scoped></style>
