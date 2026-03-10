<template>

  <Block
    :allLinkText="viewHistoryAction$()"
    :allLinkRoute="classRoute(PageNames.ATTENDANCE_HISTORY)"
    :showAllLink="!loading && sessions.length > 0"
  >
    <template #title>
      {{ attendanceLabel$() }}
    </template>

    <div>
      <KButton
        :text="markAttendanceAction$()"
        :primary="true"
        appearance="raised-button"
        :to="classRoute(PageNames.ATTENDANCE_NEW)"
      />
    </div>

    <KCircularLoader v-if="loading" />

    <p v-else-if="sessions.length === 0">
      {{ noSessionsMessage$() }}
    </p>

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
              :style="barStyle(getAbsentCount(session), session.total_count, absentColor)"
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
            {{ absentCount$({ count: getAbsentCount(session) }) }}
          </span>
        </div>
      </BlockItem>
    </template>
  </Block>

</template>


<script>

  import { onMounted, ref } from 'vue';
  import KButton from 'kolibri-design-system/lib/buttons-and-links/KButton';
  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
  import store from 'kolibri/store';
  import { useAttendance } from '../../../composables/useAttendance';
  import commonCoach from '../../common';
  import { PageNames } from '../../../constants';
  import Block from './Block';
  import BlockItem from './BlockItem';

  export default {
    name: 'AttendanceBlock',
    components: {
      Block,
      BlockItem,
      KButton,
      KCircularLoader,
    },
    mixins: [commonCoach],
    setup() {
      const { recentSessions, fetchRecentSessions, formatAttendanceDateTime } = useAttendance();
      const {
        attendanceLabel$,
        markAttendanceAction$,
        viewHistoryAction$,
        noSessionsMessage$,
        presentCount$,
        absentCount$,
      } = attendanceStrings;

      const loading = ref(true);

      const palette = themePalette();
      const presentColor = palette.green.v_500;
      const absentColor = palette.red.v_500;

      onMounted(() => {
        const classId = store.state.classSummary.id;
        fetchRecentSessions(classId)
          .catch(error => {
            store.dispatch('handleApiError', { error });
          })
          .finally(() => {
            loading.value = false;
          });
      });

      function sessionDateTime(session) {
        const { date, time } = formatAttendanceDateTime(session.session_start_datetime);
        return `${date} ${time}`;
      }

      function getAbsentCount(session) {
        return session.total_count - session.present_count;
      }

      function barStyle(count, total, color) {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return {
          width: `${percentage}%`,
          backgroundColor: color,
        };
      }

      return {
        loading,
        sessions: recentSessions,
        sessionDateTime,
        getAbsentCount,
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
