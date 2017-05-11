<template>

  <tabs>
    <tab-link
      :title="$tr('recent')"
      icon="access_time"
      :link="recentLink"
      :selected="isRecentPage"
    />
    <tab-link
      :title="$tr('topics')"
      icon="folder"
      :link="topicsLink"
      :selected="isTopicPage"
    />
    <tab-link
      :title="$tr('exams')"
      icon="assignments"
      :link="examsLink"
      :selected="Constants.ExamPages.includes(pageName)"
    />
    <!--<tab-link
      :title="$tr('learners')"
      icon="people"
      :link="learnersLink"
      :selected="isLearnerPage"
    />-->
    <tab-link
      :title="$tr('groups')"
      icon="group_work"
      :link="groupsLink"
      :selected="pageName === Constants.PageNames.GROUPS"
    />
  </tabs>

</template>


<script>

  const Constants = require('../../constants');
  const coachGetters = require('../../state/getters/main');

  module.exports = {
    $trNameSpace: 'topNav',
    $trs: {
      recent: 'Recent',
      topics: 'Topics',
      exams: 'Exams',
      learners: 'Learners',
      groups: 'Groups',
    },
    components: {
      'tabs': require('kolibri.coreVue.components.tabs'),
      'tab-link': require('kolibri.coreVue.components.tabLink'),
    },
    computed: {
      Constants() {
        return Constants;
      },
      recentLink() {
        return {
          name: Constants.PageNames.RECENT_CHANNELS,
          params: { classId: this.classId },
        };
      },
      topicsLink() {
        return {
          name: Constants.PageNames.TOPIC_CHANNELS,
          params: { classId: this.classId },
        };
      },
      examsLink() {
        return {
          name: Constants.PageNames.EXAMS,
          params: { classId: this.classId },
        };
      },
      learnersLink() {
        return {
          name: Constants.PageNames.LEARNER_LIST,
          params: { classId: this.classId },
        };
      },
      groupsLink() {
        return {
          name: Constants.PageNames.GROUPS,
          params: { classId: this.classId },
        };
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        classId: state => state.classId,
        isRecentPage: coachGetters.isRecentPage,
        isTopicPage: coachGetters.isTopicPage,
        isLearnerPage: coachGetters.isLearnerPage,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
