<template>

  <div>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="$router.getRoute('HomePage')"
        :text="coreString('classHome')"
      />
    </p>
    <h1>{{ reportTitle }}</h1>
    <p v-show="!$isPrint">
      {{ $tr('description') }}
    </p>
    <HeaderTabs>

      <HeaderTab
        :text="coreString('lessonsLabel')"
        :to="classRoute('ReportsLessonListPage')"
      />
      <HeaderTab
        :text="coreString('quizzesLabel')"
        :to="classRoute('ReportsQuizListPage')"
      />
      <HeaderTab
        :text="coachString('groupsLabel')"
        :to="classRoute('ReportsGroupListPage')"
      />
      <HeaderTab
        :text="coreString('learnersLabel')"
        :to="classRoute('ReportsLearnerListPage')"
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';

  export default {
    name: 'ReportsHeader',
    mixins: [commonCoach, commonCoreStrings],
    props: {
      title: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapGetters(['classListPageEnabled']),
      reportTitle() {
        return this.title || this.coachString('reportsLabel');
      },
    },
    $trs: {
      description: {
        message: 'View reports for your learners and class materials',
        context: "Description for the 'Reports' section.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
