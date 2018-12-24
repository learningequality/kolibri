<template>

  <div>
    <h1>{{ $tr('planYourClassLabel') }}</h1>
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
        :to="newCoachRoute('PlanLearnersListPage')"
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
      planYourClassLabel: 'Plan your class',
    },
  };

</script>


<style lang="scss" scoped></style>
