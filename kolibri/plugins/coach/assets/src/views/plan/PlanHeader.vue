<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="$router.getRoute('HomePage')"
        :text="navStrings.$tr('home')"
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

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import { LessonsPageNames } from '../../constants/lessonsConstants';
  import TopNavbar from '../TopNavbar';

  const navStrings = crossComponentTranslator(TopNavbar);

  export default {
    name: 'PlanHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      ...mapGetters(['classListPageEnabled']),
      LessonsPageNames() {
        return LessonsPageNames;
      },
      navStrings() {
        return navStrings;
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
