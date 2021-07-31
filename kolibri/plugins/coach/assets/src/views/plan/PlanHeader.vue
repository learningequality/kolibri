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
        :text="coreString('lessonsLabel')"
        :to="classRoute(LessonsPageNames.PLAN_LESSONS_ROOT)"
      />
      <HeaderTab
        :text="coreString('quizzesLabel')"
        :to="classRoute(PageNames.EXAMS)"
      />
      <HeaderTab
        :text="coachString('groupsLabel')"
        :to="classRoute('GroupsPage')"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import { LessonsPageNames } from '../../constants/lessonsConstants';

  export default {
    name: 'PlanHeader',
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      ...mapGetters(['classListPageEnabled']),
      LessonsPageNames() {
        return LessonsPageNames;
      },
    },
    $trs: {
      planYourClassLabel: {
        message: 'Plan your class',
        context: "Title of the 'Plan your class' section.",
      },
      planYourClassDescription: {
        message: 'Create and manage your lessons, quizzes, and groups',
        context: "Description of the 'Plan your class' section.",
      },
      home: {
        message: 'Class Home',
        context:
          "Tab name of the main 'Class' section where the coach can see all the information relating to a specific class.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
