<template>

  <k-navbar>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('learners')"
      icon="people"
      :link="learnersLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('groups')"
      icon="group_work"
      :link="groupsLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('lessons')"
      icon="import_contacts"
      :link="lessonsLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('exams')"
      icon="assignment_late"
      :link="examsLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('recent')"
      icon="access_time"
      :link="recentLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('channels')"
      icon="apps"
      :link="channelsLink"
    />
  </k-navbar>

</template>


<script>

  import { PageNames } from '../constants';
  import { LessonsPageNames } from '../constants/lessonsConstants';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
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
