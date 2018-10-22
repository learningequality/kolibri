<template>

  <KNavbar>
    <KNavbarLink
      :title="$tr('learners')"
      :link="learnersLink"
    >
      <mat-svg name="people" category="social" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('groups')"
      :link="groupsLink"
    >
      <mat-svg name="group_work" category="action" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('lessons')"
      :link="lessonsLink"
    >
      <mat-svg name="import_contacts" category="communication" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('exams')"
      :link="examsLink"
    >
      <mat-svg name="assignment_late" category="action" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('recent')"
      :link="recentLink"
    >
      <mat-svg name="access_time" category="device" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('channels')"
      :link="channelsLink"
    >
      <mat-svg name="apps" category="navigation" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import { mapState } from 'vuex';
  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { PageNames } from '../constants';
  import { LessonsPageNames } from '../constants/lessonsConstants';

  export default {
    name: 'CoachTopNav',
    $trs: {
      recent: 'Recent',
      channels: 'Channels',
      exams: 'Exams',
      learners: 'Learners',
      groups: 'Groups',
      lessons: 'Lessons',
    },
    components: {
      KNavbar,
      KNavbarLink,
    },
    computed: {
      ...mapState(['pageName', 'classId']),
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
  };

</script>


<style lang="scss" scoped></style>
