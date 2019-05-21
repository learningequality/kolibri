<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="$router.getRoute('HomePage')"
        :text="navStrings.$tr('home')"
      />
    </p>
    <h1>{{ common$tr('reportsLabel') }}</h1>
    <p>{{ $tr('description') }}</p>
    <HeaderTabs>

      <HeaderTab
        :text="common$tr('lessonsLabel')"
        :to="classRoute('ReportsLessonListPage')"
      />
      <HeaderTab
        :text="common$tr('quizzesLabel')"
        :to="classRoute('ReportsQuizListPage')"
      />
      <HeaderTab
        :text="common$tr('groupsLabel')"
        :to="classRoute('ReportsGroupListPage')"
      />
      <HeaderTab
        :text="common$tr('learnersLabel')"
        :to="classRoute('ReportsLearnerListPage')"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import TopNavbar from '../TopNavbar';

  const navStrings = crossComponentTranslator(TopNavbar);

  export default {
    name: 'ReportsHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      ...mapGetters(['classListPageEnabled']),
      navStrings() {
        return navStrings;
      },
    },
    $trs: {
      back: 'All classes',
      description: 'View reports for your learners and class materials',
    },
  };

</script>


<style lang="scss" scoped></style>
