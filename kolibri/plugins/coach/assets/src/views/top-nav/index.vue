<template>

  <div class="top">
    <nav-link
      :to="recentLink"
      :active="isActive(Constants.PageNames.RECENT)"
      :text="$tr('recent')"
    />
    <nav-link
      :to="topicsLink"
      :active="isActive(Constants.PageNames.TOPICS)"
      :text="$tr('topics')"
    />
    <nav-link
      :to="examsLink"
      :active="isActive(Constants.PageNames.EXAMS)"
      :text="$tr('exams')"
    />
    <nav-link
      :to="learnersLink"
      :active="isActive(Constants.PageNames.LEARNERS)"
      :text="$tr('learners')"
    />
    <nav-link
      :to="groupsLink"
      :active="isActive(Constants.PageNames.GROUPS)"
      :text="$tr('groups')"
    />
  </div>

</template>


<script>

  const Constants = require('../../constants');

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
          name: Constants.PageNames.RECENT,
          params: { classId: this.classId },
        };
      },
      topicsLink() {
        return {
          name: Constants.PageNames.TOPICS_ROOT,
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
          name: Constants.PageNames.LEARNERS,
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
    methods: {
      isActive(thatPageName) {
        return this.pageName === thatPageName;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
        classId: state => state.pageState.classId,
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
