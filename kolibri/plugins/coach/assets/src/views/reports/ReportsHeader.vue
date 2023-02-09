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
    <KTabsList
      ref="tabsList"
      tabsId="coachReports"
      ariaLabel="Coach reports"
      :activeTabId="activeTabId"
      :tabs="tabs"
      :style="{ marginBottom: '24px' }"
    />
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
      activeTabId: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        tabs: [
          {
            id: 'tabLessons',
            label: this.coreString('lessonsLabel'),
            to: this.classRoute('ReportsLessonListPage'),
          },
          {
            id: 'tabQuizzes',
            label: this.coreString('quizzesLabel'),
            to: this.classRoute('ReportsQuizListPage'),
          },
          {
            id: 'tabGroups',
            label: this.coachString('groupsLabel'),
            to: this.classRoute('ReportsGroupListPage'),
          },
          {
            id: 'tabLearners',
            label: this.coreString('learnersLabel'),
            to: this.classRoute('ReportsLearnerListPage'),
          },
        ],
      };
    },
    computed: {
      ...mapGetters(['classListPageEnabled']),
      reportTitle() {
        return this.title || this.coachString('reportsLabel');
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.$refs.tabsList.focusActiveTab();
      });
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
