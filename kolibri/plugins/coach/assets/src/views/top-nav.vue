<template>

  <k-navbar>
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
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('lessons')"
      :link="lessonsLink"
    >
      <mat-svg name="import_contacts" category="communication" />
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
      :title="$tr('recent')"
      :link="recentLink"
    >
      <mat-svg name="access_time" category="device" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('channels')"
      :link="channelsLink"
    >
      <mat-svg name="apps" category="navigation" />
    </k-navbar-link>
  </k-navbar>

</template>


<script>

  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  import { PageNames } from '../constants';
  import { LessonsPageNames } from '../constants/lessonsConstants';

  export default {
    name: 'topNav',
    $trs: {
      recent: 'Recent',
      channels: 'Channels',
      exams: 'Exams',
      learners: 'Learners',
      groups: 'Groups',
      lessons: 'Lessons',
    },
    components: {
      kNavbar,
      kNavbarLink,
    },
    computed: {
      recentLink() {
        return {
          name: PageNames.RECENT_CHANNELS,
          params: { classId: this.classId },
        };
      },
      channelsLink() {
        return {
          name: PageNames.TOPIC_CHANNELS,
          params: { classId: this.classId },
        };
      },
      examsLink() {
        return {
          name: PageNames.EXAMS,
          params: { classId: this.classId },
        };
      },
      learnersLink() {
        return {
          name: PageNames.LEARNER_LIST,
          params: { classId: this.classId },
        };
      },
      groupsLink() {
        return {
          name: PageNames.GROUPS,
          params: { classId: this.classId },
        };
      },
      lessonsLink() {
        return {
          name: LessonsPageNames.ROOT,
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
