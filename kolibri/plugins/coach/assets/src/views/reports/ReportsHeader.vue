<template>

  <div>
    <p>
      <BackLink
        v-if="multipleClasses"
        :to="$router.getRoute('CoachClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ coachStrings.$tr('reportsLabel') }}</h1>
    <p>{{ $tr('description') }}</p>
    <HeaderTabs>

      <HeaderTab
        :text="coachStrings.$tr('lessonsLabel')"
        :to="classRoute('ReportsLessonListPage')"
      />
      <HeaderTab
        :text="coachStrings.$tr('quizzesLabel')"
        :to="classRoute('ReportsQuizListPage')"
      />
      <HeaderTab
        :text="coachStrings.$tr('groupsLabel')"
        :to="classRoute('ReportsGroupListPage')"
      />
      <HeaderTab
        :text="coachStrings.$tr('learnersLabel')"
        :to="classRoute('ReportsLearnerListPage')"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../common';

  export default {
    name: 'ReportsHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      ...mapGetters(['multipleClasses']),
    },
    $trs: {
      back: 'All classes',
      description: 'View reports for your learners and class materials',
    },
  };

</script>


<style lang="scss" scoped></style>
