<template>

  <Block
    :allLinkText="$tr('viewHistory')"
    :allLinkRoute="historyRoute"
    :showAllLink="sessions.length > 0"
  >
    <template #title>
      <KLabeledIcon
        icon="registered"
        :label="$tr('classAttendance')"
      />
    </template>

    <div>
      <KButton
        :text="$tr('markAttendance')"
        :primary="true"
        @click="$router.push(markAttendanceRoute)"
      />
    </div>

    <div
      v-if="sessions.length > 0"
      class="recent-sessions"
    >
      <div
        v-for="session in recentSessions"
        :key="session.id"
        class="session-item"
        :style="{ borderBottomColor: $themeTokens.fineLine }"
      >
        <KRouterLink
          :text="sessionLabel(session)"
          appearance="basic-link"
          :to="sessionRoute(session)"
        />
      </div>
    </div>
    <p v-else>
      {{ $tr('noAttendanceYet') }}
    </p>
  </Block>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../../common';
  import useAttendance from '../../../composables/useAttendance';
  import { PageNames } from '../../../constants';
  import Block from './Block';

  const MAX_RECENT_SESSIONS = 5;

  export default {
    name: 'AttendanceBlock',
    components: {
      Block,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { sessions, fetchSessions, isLoading } = useAttendance();
      return { sessions, fetchSessions, isLoading };
    },
    computed: {
      recentSessions() {
        return this.sessions.slice(0, MAX_RECENT_SESSIONS);
      },
      markAttendanceRoute() {
        return this.classRoute(PageNames.ATTENDANCE_ROOT, {});
      },
      historyRoute() {
        return this.classRoute(PageNames.ATTENDANCE_HISTORY, {});
      },
    },
    created() {
      const classId = this.$route.params.classId;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      this.fetchSessions(classId, {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });
    },
    methods: {
      sessionLabel(session) {
        const date = new Date(session.date);
        const formatted = this.$formatDate(date, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        return this.$tr('sessionLabel', {
          date: formatted,
          sessionNumber: session.session_number,
        });
      },
      sessionRoute(session) {
        return this.classRoute(PageNames.ATTENDANCE_SESSION, {
          sessionId: session.id,
        });
      },
    },
    $trs: {
      classAttendance: {
        message: 'Class attendance',
        context: 'Title for the attendance section on the class home page.',
      },
      markAttendance: {
        message: 'Mark attendance',
        context: 'Button text to start marking attendance for the class.',
      },
      viewHistory: {
        message: 'View history',
        context: 'Link text to navigate to the full attendance history page.',
      },
      noAttendanceYet: {
        message: 'No attendance has been taken for this class.',
        context: 'Message shown when no attendance sessions exist for this class.',
      },
      sessionLabel: {
        message: '{date} - Session {sessionNumber}',
        context: 'Label for an attendance session link showing the date and session number.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .recent-sessions {
    margin-top: 16px;
  }

  .session-item {
    padding: 8px 0;
    border-bottom: 1px solid;
  }

</style>
