<template>

  <Block
    :allLinkText="viewHistoryAction$()"
    :allLinkRoute="classRoute(PageNames.ATTENDANCE_HISTORY)"
    :showAllLink="!loading && sessions.length > 0"
  >
    <template #title>
      {{ attendanceLabel$() }}
    </template>

    <div v-if="learners.length">
      <KRouterLink
        :text="markAttendanceAction$()"
        :primary="true"
        appearance="raised-button"
        :to="classRoute(PageNames.ATTENDANCE_NEW)"
      />
    </div>

    <KCircularLoader v-if="loading" />

    <div v-else-if="sessions.length === 0">
      <p v-if="learners.length">
        {{ noSessionsMessage$() }}
      </p>
      <p v-else>
        {{ noSessionsEnrollMessage$() }}
      </p>
    </div>

    <template v-else>
      <BlockItem
        v-for="session in sessions"
        :key="session.id"
      >
        <div class="session-date">
          {{ sessionDateTime(session) }}
        </div>
        <div
          class="bar-container"
          aria-hidden="true"
        >
          <div class="bar">
            <div
              class="bar-segment"
              :style="barStyle(session.present_count, session.total_count, presentColor)"
            ></div>
            <div
              class="bar-segment"
              :style="barStyle(session.absentCount, session.total_count, absentColor)"
            ></div>
          </div>
        </div>
        <div class="counts">
          <span class="count-item">
            <span
              class="dot"
              :style="{ backgroundColor: presentColor }"
            ></span>
            {{ presentCount$({ count: session.present_count }) }}
          </span>
          <span class="count-item">
            <span
              class="dot"
              :style="{ backgroundColor: absentColor }"
            ></span>
            {{ absentCount$({ count: session.absentCount }) }}
          </span>
        </div>
      </BlockItem>
    </template>
  </Block>

</template>


<script>

  import { computed, onMounted, ref } from 'vue';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
  import store from 'kolibri/store';
  import { handleApiError } from 'kolibri/utils/appError';
  import { useAttendance } from '../../../composables/useAttendance';
  import useCoreCoach from '../../../composables/useCoreCoach';
  import commonCoach from '../../common';
  import { PageNames } from '../../../constants';
  import Block from './Block';
  import BlockItem from './BlockItem';

  export default {
    name: 'AttendanceBlock',
    components: {
      Block,
      BlockItem,
    },
    mixins: [commonCoach],
    setup() {
      const { classId } = useCoreCoach();
      const { recentSessions, fetchRecentSessions, formatAttendanceDateTime } = useAttendance();
      const {
        attendanceLabel$,
        markAttendanceAction$,
        viewHistoryAction$,
        noSessionsMessage$,
        presentCount$,
        absentCount$,
        noSessionsEnrollMessage$,
      } = attendanceStrings;

      const loading = ref(true);

      const palette = themePalette();
      const presentColor = palette.green.v_500;
      const absentColor = palette.red.v_500;

      const learners = computed(() => store.getters['classSummary/learners']);

      onMounted(() => {
        fetchRecentSessions(classId.value)
          .catch(error => {
            handleApiError({ error });
          })
          .finally(() => {
            loading.value = false;
          });
      });

      function sessionDateTime(session) {
        const { date, time } = formatAttendanceDateTime(session.session_start_datetime);
        return `${date} ${time}`;
      }

      const sessions = computed(() =>
        recentSessions.value.map(session => {
          const absentCount = session.total_count - session.present_count;
          return { ...session, absentCount };
        }),
      );

      function barStyle(count, total, color) {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return {
          width: `${percentage}%`,
          backgroundColor: color,
        };
      }

      return {
        loading,
        sessions,
        sessionDateTime,
        barStyle,
        presentColor,
        absentColor,
        attendanceLabel$,
        markAttendanceAction$,
        viewHistoryAction$,
        noSessionsMessage$,
        presentCount$,
        absentCount$,
        PageNames,
        learners,
        noSessionsEnrollMessage$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .session-date {
    margin-bottom: 4px;
    font-size: 14px;
  }

  .bar-container {
    margin-bottom: 4px;
  }

  .bar {
    display: flex;
    height: 8px;
    overflow: hidden;
    border-radius: 4px;
  }

  .bar-segment {
    height: 100%;
  }

  .counts {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }

  .count-item {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

</style>
