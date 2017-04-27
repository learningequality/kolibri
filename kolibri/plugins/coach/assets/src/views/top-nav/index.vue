<template>

  <div class="top">
    <nav-link
      :to="recentLink"
      :active="isRecentPage"
      :text="$tr('recent')"
    />
    <nav-link
      :to="topicsLink"
      :active="isTopicPage"
      :text="$tr('topics')"
    />
    <nav-link
      :to="examsLink"
      :active="Constants.ExamPages.includes(pageName)"
      :text="$tr('exams')"
    />
    <!--
    <nav-link
      :to="learnersLink"
      :active="isLearnerPage"
      :text="$tr('learners')"
    />
    -->
    <nav-link
      :to="groupsLink"
      :active="pageName === Constants.PageNames.GROUPS"
      :text="$tr('groups')"
    />
  </div>

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
      'nav-link': require('./nav-link'),
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .top
    position: relative
    padding: 8px
    background: $core-bg-light

</style>
