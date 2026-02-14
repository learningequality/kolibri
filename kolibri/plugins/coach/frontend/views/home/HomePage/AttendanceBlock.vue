<template>

  <Block
    :allLinkText="coachString('viewHistoryAction')"
    :allLinkRoute="historyRoute"
    :showAllLink="recentSessionData.length > 0"
  >
    <template #title>
      <KLabeledIcon
        icon="people"
        :label="coachString('attendanceLabel')"
      />
    </template>

    <KRouterLink
      :text="coachString('markAttendanceAction')"
      primary
      appearance="raised-button"
      class="mark-attendance-button"
      :to="newAttendanceRoute"
    />

    <template v-if="recentSessionData.length > 0">
      <div
        v-for="session in displayedSessions"
        :key="session.id"
        class="session-item"
      >
        <div class="session-date">
          {{ formatSessionDate(session) }}
        </div>
        <div class="session-bar">
          <div
            class="session-bar-present"
            :style="{
              width: presentPercentage(session) + '%',
              backgroundColor: $themePalette.green.v_500,
            }"
          ></div>
          <div
            class="session-bar-absent"
            :style="{
              width: absentPercentage(session) + '%',
              backgroundColor: $themePalette.red.v_500,
            }"
          ></div>
        </div>
        <div class="session-counts">
          <span class="session-count">
            <span
              class="count-dot"
              :style="{ backgroundColor: $themePalette.green.v_500 }"
            ></span>
            {{ $tr('presentCount', { count: presentCountForSession(session) }) }}
          </span>
          <span class="session-count">
            <span
              class="count-dot"
              :style="{ backgroundColor: $themePalette.red.v_500 }"
            ></span>
            {{ $tr('absentCount', { count: absentCountForSession(session) }) }}
          </span>
        </div>
      </div>
    </template>

    <p v-else>
      {{ $tr('noAttendanceYet') }}
    </p>
  </Block>

</template>


<script>

  import { ref, computed, onMounted, getCurrentInstance } from 'vue';
  import router from 'kolibri/router';
  import { PageNames } from '../../../constants';
  import { coachString } from '../../common/commonCoachStrings';
  import useAttendance from '../../../composables/useAttendance';
  import Block from './Block';

  const MAX_DISPLAYED_SESSIONS = 5;

  export default {
    name: 'AttendanceBlock',
    components: {
      Block,
    },
    setup() {
      const store = getCurrentInstance().proxy.$store;
      const classId = computed(() => store.state.classSummary.id);

      const { fetchRecentSessions, recentSessions, formatAttendanceDateTime } = useAttendance();

      const recentSessionData = ref([]);

      const displayedSessions = computed(() =>
        recentSessionData.value.slice(0, MAX_DISPLAYED_SESSIONS),
      );

      function classRoute(name, params = {}) {
        if (classId.value) {
          params.classId = classId.value;
        }
        return router.getRoute(name, params);
      }

      const historyRoute = computed(() => classRoute(PageNames.ATTENDANCE_HISTORY, {}));
      const newAttendanceRoute = computed(() => classRoute(PageNames.ATTENDANCE_NEW, {}));

      function formatSessionDate(session) {
        return formatAttendanceDateTime(session.session_start_datetime);
      }

      function presentCountForSession(session) {
        if (!session.attendance_records) {
          return session.present_count || 0;
        }
        return session.attendance_records.filter(r => r.present).length;
      }

      function absentCountForSession(session) {
        if (!session.attendance_records) {
          return session.total_count ? session.total_count - (session.present_count || 0) : 0;
        }
        return session.attendance_records.filter(r => !r.present).length;
      }

      function totalCountForSession(session) {
        return presentCountForSession(session) + absentCountForSession(session);
      }

      function presentPercentage(session) {
        const total = totalCountForSession(session);
        if (total === 0) return 0;
        return (presentCountForSession(session) / total) * 100;
      }

      function absentPercentage(session) {
        const total = totalCountForSession(session);
        if (total === 0) return 0;
        return (absentCountForSession(session) / total) * 100;
      }

      onMounted(() => {
        fetchRecentSessions(classId.value, 5).then(() => {
          recentSessionData.value = recentSessions.value;
        });
      });

      return {
        coachString,
        recentSessionData,
        displayedSessions,
        historyRoute,
        newAttendanceRoute,
        formatSessionDate,
        presentCountForSession,
        absentCountForSession,
        presentPercentage,
        absentPercentage,
      };
    },
    $trs: {
      noAttendanceYet: {
        message: 'No attendance sessions yet',
        context:
          'Message shown on the class home page when no attendance sessions have been recorded.',
      },
      presentCount: {
        message: '{count, number} Present',
        context:
          'Shows the number of present learners for a recent attendance session on the class home page.',
      },
      absentCount: {
        message: '{count, number} Absent',
        context:
          'Shows the number of absent learners for a recent attendance session on the class home page.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .mark-attendance-button {
    display: block;
    width: 100%;
    margin-bottom: 16px;
  }

  .session-item {
    margin-bottom: 16px;
  }

  .session-date {
    margin-bottom: 4px;
    font-size: 14px;
  }

  .session-bar {
    display: flex;
    height: 8px;
    overflow: hidden;
    border-radius: 4px;
  }

  .session-bar-present,
  .session-bar-absent {
    height: 100%;
  }

  .session-counts {
    display: flex;
    gap: 16px;
    margin-top: 4px;
    font-size: 13px;
  }

  .session-count {
    display: flex;
    align-items: center;
  }

  .count-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    border-radius: 50%;
  }

</style>
