<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="$router.getRoute('HomePage')"
        :text="$tr('home')"
      />
    </p>
    <h1>{{ $tr('planYourClassLabel') }}</h1>
    <p>{{ $tr('planYourClassDescription') }}</p>
    <HeaderTabs>
      <HeaderTab
        :text="common$tr('lessonsLabel')"
        :to="classRoute(LessonsPageNames.PLAN_LESSONS_ROOT)"
      />
      <HeaderTab
        :text="common$tr('quizzesLabel')"
        :to="classRoute(PageNames.EXAMS)"
      />
      <HeaderTab
        :text="common$tr('groupsLabel')"
        :to="classRoute('GroupsPage')"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import { LessonsPageNames } from '../../constants/lessonsConstants';

  export default {
    name: 'PlanHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      ...mapGetters(['classListPageEnabled']),
      LessonsPageNames() {
        return LessonsPageNames;
      },
    },
    $trs: {
      back: 'All classes',
      planYourClassLabel: 'Plan your class',
      planYourClassDescription: 'Create and manage your lessons, quizzes, and groups',
      home: 'Class Home',
    },
  };

</script>


<style lang="scss" scoped></style>
