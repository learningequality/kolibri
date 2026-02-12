<template>
  <CoachAppBarPage :appBarTitle="$tr('attendanceHistoryTitle')">
    <KPageContainer>
      <BackLink
        :to="classHomeRoute"
        :text="coachString('classHome')"
      />
      <h1>{{ $tr('attendanceHistoryTitle') }}</h1>

      <KSelect
        v-model="selectedDateRange"
        :label="$tr('dateRangeLabel')"
        :options="dateRangeOptions"
        :inline="true"
        @change="handleDateRangeChange"
      />

      <KDateRange
        v-if="showDateRangeModal"
        :title="$tr('customDateRangeTitle')"
        :submitText="coreString('confirmAction')"
        :cancelText="coreString('cancelAction')"
        :lastAllowedDate="today"
        @submit="handleCustomDateSubmit"
        @cancel="handleCustomDateCancel"
      />

      <div v-if="isLoading">
        <KCircularLoader />
      </div>
      <div v-else-if="sessions.length === 0">
        <p>{{ $tr('noSessionsMessage') }}</p>
      </div>
      <div v-else>
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-link"
          :style="{ borderBottomColor: $themeTokens.fineLine }"
        >
          <KRouterLink
            :text="sessionLabel(session)"
            appearance="basic-link"
            :to="sessionRoute(session)"
          />
        </div>
      </div>
    </KPageContainer>
  </CoachAppBarPage>
</template>

<script>
  import { ref } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import KDateRange from 'kolibri-design-system/lib/KDateRange';
  import CoachAppBarPage from '../CoachAppBarPage';
  import commonCoach from '../common';
  import useAttendance from '../../composables/useAttendance';
  import { PageNames } from '../../constants';

  export default {
    name: 'AttendanceHistoryPage',
    components: {
      CoachAppBarPage,
      KDateRange,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { sessions, isLoading, fetchSessions } = useAttendance();

      const selectedDateRange = ref('past30');
      const showDateRangeModal = ref(false);
      const customStartDate = ref(null);
      const customEndDate = ref(null);

      return {
        sessions,
        isLoading,
        fetchSessions,
        selectedDateRange,
        showDateRangeModal,
        customStartDate,
        customEndDate,
      };
    },
    computed: {
      dateRangeOptions() {
        return [
          { label: this.$tr('past7Days'), value: 'past7' },
          { label: this.$tr('past30Days'), value: 'past30' },
          { label: this.$tr('past365Days'), value: 'past365' },
          { label: this.$tr('customDateRange'), value: 'custom' },
        ];
      },
      classHomeRoute() {
        return this.classRoute(PageNames.HOME_PAGE, {});
      },
      today() {
        return new Date();
      },
    },
    created() {
      this.loadSessions();
    },
    methods: {
      loadSessions() {
        const classId = this.$route.params.classId;
        const { startDate, endDate } = this.getDateRange();
        this.fetchSessions(classId, { startDate, endDate });
      },
      getDateRange() {
        const end = new Date();
        const endDate = end.toISOString().split('T')[0];
        let startDate;

        switch (this.selectedDateRange) {
          case 'past7': {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            startDate = d.toISOString().split('T')[0];
            break;
          }
          case 'past30': {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            startDate = d.toISOString().split('T')[0];
            break;
          }
          case 'past365': {
            const d = new Date();
            d.setDate(d.getDate() - 365);
            startDate = d.toISOString().split('T')[0];
            break;
          }
          case 'custom':
            startDate = this.customStartDate;
            return { startDate, endDate: this.customEndDate || endDate };
          default:
            startDate = null;
        }
        return { startDate, endDate };
      },
      handleDateRangeChange(option) {
        this.selectedDateRange = option.value;
        if (option.value === 'custom') {
          this.showDateRangeModal = true;
        } else {
          this.loadSessions();
        }
      },
      handleCustomDateSubmit({ start, end }) {
        this.customStartDate = start;
        this.customEndDate = end;
        this.showDateRangeModal = false;
        this.loadSessions();
      },
      handleCustomDateCancel() {
        this.showDateRangeModal = false;
        // Revert to previous non-custom selection if no custom dates have been set
        if (!this.customStartDate) {
          this.selectedDateRange = 'past30';
        }
      },
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
      attendanceHistoryTitle: {
        message: 'Attendance history',
        context: 'Title for the attendance history page.',
      },
      dateRangeLabel: {
        message: 'Date range',
        context: 'Label for the date range filter dropdown.',
      },
      past7Days: {
        message: 'Past 7 days',
        context: 'Option in the date range filter for the last 7 days.',
      },
      past30Days: {
        message: 'Past 30 days',
        context: 'Option in the date range filter for the last 30 days.',
      },
      past365Days: {
        message: 'Past 365 days',
        context: 'Option in the date range filter for the last 365 days.',
      },
      customDateRange: {
        message: 'Custom',
        context: 'Option in the date range filter for selecting a custom date range.',
      },
      customDateRangeTitle: {
        message: 'Select date range',
        context: 'Title for the custom date range selection modal.',
      },
      noSessionsMessage: {
        message: 'No attendance sessions found for the selected date range.',
        context: 'Message shown when there are no attendance sessions in the selected date range.',
      },
      sessionLabel: {
        message: '{date} - Session {sessionNumber}',
        context: 'Label for an attendance session link showing the date and session number.',
      },
    },
  };
</script>

<style lang="scss" scoped>
  .session-link {
    padding: 12px 0;
    border-bottom: 1px solid;
  }
</style>
