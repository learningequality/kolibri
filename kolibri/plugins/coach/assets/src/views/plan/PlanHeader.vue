<template>

  <div>
    <p>
      <BackLink
        :to="route(PageNames.COACH_CLASS_LIST)"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ $tr('planYourClassLabel') }}</h1>
    <p>{{ $tr('planYourClassDescription') }}</p>
    <div>
      <KRouterLink
        :text="coachStrings.$tr('lessonsLabel')"
        :to="classRoute(LessonsPageNames.PLAN_LESSONS_ROOT)"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('quizzesLabel')"
        :to="classRoute(PageNames.EXAMS)"
        :primary="false"
        appearance="flat-button"
        class="new-coach-tab"
      />
      <KRouterLink
        :text="coachStrings.$tr('groupsLabel')"
        :to="classRoute(PageNames.PLAN_GROUPS_PAGE)"
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
  import { LessonsPageNames } from '../../constants/lessonsConstants';

  export default {
    name: 'PlanHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      LessonsPageNames() {
        return LessonsPageNames;
      },
    },
    $trs: {
      back: 'All classes',
      planYourClassLabel: 'Plan your class',
      planYourClassDescription: 'Create and manage your lessons, quizzes, and groups',
    },
  };

</script>


<style lang="scss" scoped></style>
