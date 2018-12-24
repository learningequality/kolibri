<template>

  <div>
    <p>
      <BackLink
        :to="newCoachRoute('CoachClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ $tr('planYourClassLabel') }}</h1>
    <p>{{ $tr('planYourClassDescription') }}</p>
    <div>
      <KRouterLink
        :text="coachStrings.$tr('lessonsLabel')"
        :to="newCoachRoute('PlanLessonListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('quizzesLabel')"
        :to="newCoachRoute('PlanQuizListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('groupsLabel')"
        :to="newCoachRoute('PlanGroupListPage')"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('learnersLabel')"
        :to="newCoachRoute('PlanLearnerListPage')"
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
    name: 'PlanHeader',
    components: {},
    mixins: [imports],
    $trs: {
      back: 'All classes',
      planYourClassLabel: 'Plan your class',
      planYourClassDescription: 'Create and manage your lessons, quizzes, and groups',
    },
  };

</script>


<style lang="scss" scoped></style>
