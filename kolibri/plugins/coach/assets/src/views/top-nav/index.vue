<template>

  <k-navbar>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('topics')"
      :link="topicsLink"
    >
      <mat-svg name="folder" category="file" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('recent')"
      :link="recentLink"
    >
      <mat-svg name="access_time" category="device" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('exams')"
      :link="examsLink"
    >
      <mat-svg name="assignment_late" category="action" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('learners')"
      :link="learnersLink"
    >
      <mat-svg name="people" category="social" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('groups')"
      :link="groupsLink"
    >
      <mat-svg name="group_work" category="action" />
    </k-navbar-link>
  </k-navbar>

</template>


<script>

  import * as Constants from '../../constants';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
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
      kNavbarLink,
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
