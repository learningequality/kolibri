<template>

  <k-navbar>
    <tab-link
      type="icon-and-title"
      :title="$tr('topics')"
      icon="folder"
      :link="topicsLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('recent')"
      icon="access_time"
      :link="recentLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('exams')"
      icon="assignment_late"
      :link="examsLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('learners')"
      icon="people"
      :link="learnersLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('groups')"
      icon="group_work"
      :link="groupsLink"
    />
  </k-navbar>

</template>


<script>

  import * as Constants from '../../constants';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import tabLink from 'kolibri.coreVue.components.tabLink';
  export default {
    name: 'topNav',
    $trs: {
      recent: 'Recent',
      topics: 'Topics',
      exams: 'Exams',
      learners: 'Learners',
      groups: 'Groups',
    },
    components: {
      kNavbar,
      tabLink,
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
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
