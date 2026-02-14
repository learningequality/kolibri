<template>

  <CoachAppBarPage>
    <KPageContainer>
      <KRouterLink
        :to="classHomeRoute"
        :text="$tr('backToClass', { className: className })"
        appearance="basic-link"
        icon="back"
        class="back-link"
      />

      <div class="header-row">
        <h1>{{ coachString('attendanceHistoryLabel') }}</h1>
        <KRouterLink
          :text="coachString('markAttendanceAction')"
          primary
          appearance="raised-button"
          :to="newAttendanceRoute"
        />
      </div>

      <div class="filter-row">
        <KSelect
          v-model="selectedRangeOption"
          :label="$tr('dateRange')"
          :options="dateRangeOptions"
          :inline="true"
          class="date-range-select"
        />
      </div>

      <KDateRange
        v-if="showCustomDateRange"
        :title="$tr('dateRange')"
        :submitText="$tr('applyFilter')"
        :cancelText="coreString('cancelAction')"
        :startDateLegendText="$tr('startDate')"
        :endDateLegendText="$tr('endDate')"
        :previousMonthText="$tr('previousMonth')"
        :nextMonthText="$tr('nextMonth')"
        :lastAllowedDate="new Date()"
        v-bind="dateRangeErrorMessages"
        @submit="applyCustomRange"
        @cancel="cancelCustomRange"
      />

      <nav
        v-if="sessionData.length > 0"
        class="pagination-nav"
      >
        <span class="pagination-label">
          {{
            coachString('attendanceSessionPaginationLabel', {
              start: (currentPage - 1) * ITEMS_PER_PAGE + 1,
              end: Math.min(currentPage * ITEMS_PER_PAGE, sessionData.length),
              total: sessionData.length,
            })
          }}
        </span>
        <KButtonGroup>
          <KIconButton
            icon="chevronLeft"
            :ariaLabel="coachString('attendancePreviousPage')"
            :disabled="currentPage === 1"
            size="small"
            @click="currentPage = currentPage - 1"
          />
          <KIconButton
            icon="chevronRight"
            :ariaLabel="coachString('attendanceNextPage')"
            :disabled="currentPage === totalPages"
            size="small"
            @click="currentPage = currentPage + 1"
          />
        </KButtonGroup>
      </nav>

      <KTable
        :headers="tableHeaders"
        :rows="tableRows"
        :caption="coachString('attendanceHistoryLabel')"
        :emptyMessage="$tr('noSessions')"
        :dataLoading="attendanceLoading"
        :defaultSort="defaultTableSort"
        sortable
      >
        <template #cell="{ content, colIndex, rowIndex }">
          <template v-if="colIndex === 0">
            <KRouterLink
              :text="formatDateTime(content)"
              :to="editRoute(paginatedSessions[rowIndex].id)"
              appearance="basic-link"
            />
          </template>
          <template v-else>
            {{ content }}
          </template>
        </template>
      </KTable>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { mapState } from 'vuex';
  import KDateRange from 'kolibri-design-system/lib/KDateRange';
  import validationConstants from 'kolibri-design-system/lib/KDateRange/validationConstants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage';
  import { coachStringsMixin } from '../common/commonCoachStrings';
  import useAttendance from '../../composables/useAttendance';

  export default {
    name: 'AttendanceHistoryPage',
    components: {
      CoachAppBarPage,
      KDateRange,
    },
    mixins: [commonCoreStrings, coachStringsMixin],
    setup() {
      const { fetchSessions, sessions, attendanceLoading, formatAttendanceDateTime } =
        useAttendance();
      return {
        fetchSessions,
        sessions,
        attendanceLoading,
        formatAttendanceDateTime,
      };
    },
    data() {
      return {
        selectedRangeOption: { label: '', value: '30' },
        showCustomDateRange: false,
        customStartDate: null,
        customEndDate: null,
        customRangeLabel: '',
        sessionData: [],
        currentPage: 1,
        ITEMS_PER_PAGE: 10,
      };
    },
    computed: {
      ...mapState('classSummary', {
        classId: 'id',
        className: 'name',
      }),
      selectedRange() {
        return this.selectedRangeOption.value;
      },
      classHomeRoute() {
        return {
          name: PageNames.HOME_PAGE,
          params: { classId: this.$route.params.classId },
        };
      },
      newAttendanceRoute() {
        return {
          name: PageNames.ATTENDANCE_NEW,
          params: { classId: this.$route.params.classId },
        };
      },
      computedStartDate() {
        if (this.selectedRange === 'customApplied') {
          return new Date(this.customStartDate);
        }
        if (this.selectedRange === 'all') {
          return new Date(0);
        }
        const now = new Date();
        const days = parseInt(this.selectedRange, 10);
        if (isNaN(days)) {
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      },
      computedEndDate() {
        if (this.selectedRange === 'customApplied') {
          return new Date(this.customEndDate);
        }
        return new Date();
      },
      dateRangeOptions() {
        const options = [
          { label: this.$tr('past7Days'), value: '7' },
          { label: this.$tr('past30Days'), value: '30' },
          { label: this.$tr('past365Days'), value: '365' },
          { label: this.$tr('allTime'), value: 'all' },
          { label: this.$tr('customRange'), value: 'custom' },
        ];
        if (this.customRangeLabel) {
          options.push({ label: this.customRangeLabel, value: 'customApplied' });
        }
        return options;
      },
      dateRangeErrorMessages() {
        return {
          [validationConstants.MALFORMED]: this.$tr('invalidDateError'),
          [validationConstants.START_DATE_AFTER_END_DATE]: this.$tr('startDateAfterEndDateError'),
          [validationConstants.FUTURE_DATE]: this.$tr('futureDateError'),
          [validationConstants.DATE_BEFORE_FIRST_ALLOWED]: this.$tr('dateBeforeFirstAllowedError'),
        };
      },
      tableHeaders() {
        return [
          { label: this.$tr('dateColumn'), dataType: 'date', columnId: 'date' },
          { label: this.$tr('present'), dataType: 'number', columnId: 'present' },
          { label: this.$tr('absent'), dataType: 'number', columnId: 'absent' },
        ];
      },
      defaultTableSort() {
        return { columnId: 'date', direction: 'desc' };
      },
      tableRows() {
        return this.paginatedSessions.map(session => [
          new Date(session.session_start_datetime),
          this.presentCount(session),
          this.absentCount(session),
        ]);
      },
      totalPages() {
        return Math.ceil(this.sessionData.length / this.ITEMS_PER_PAGE);
      },
      paginatedSessions() {
        const start = (this.currentPage - 1) * this.ITEMS_PER_PAGE;
        const end = start + this.ITEMS_PER_PAGE;
        return this.sessionData.slice(start, end);
      },
    },
    watch: {
      selectedRange(newVal) {
        if (newVal === 'custom') {
          this.showCustomDateRange = true;
        } else {
          this.showCustomDateRange = false;
          this.currentPage = 1;
          this.loadSessions();
        }
      },
    },
    created() {
      this.selectedRangeOption = this.dateRangeOptions.find(o => o.value === '30');
      this.loadSessions();
    },
    methods: {
      loadSessions() {
        const params = {
          start_date: this.computedStartDate.toISOString(),
          end_date: this.computedEndDate.toISOString(),
        };
        this.fetchSessions(this.classId, params).then(() => {
          this.sessionData = this.sessions;
        });
      },
      applyCustomRange({ start, end }) {
        this.customStartDate = start;
        this.customEndDate = end;
        const dateOpts = { day: '2-digit', month: 'short', year: 'numeric' };
        this.customRangeLabel = this.$tr('customRangeLabel', {
          startDate: this.$formatDate(start, dateOpts),
          endDate: this.$formatDate(end, dateOpts),
        });
        this.showCustomDateRange = false;
        const customOption = { label: this.customRangeLabel, value: 'customApplied' };
        this.selectedRangeOption = customOption;
      },
      cancelCustomRange() {
        this.showCustomDateRange = false;
        if (this.selectedRange === 'custom') {
          this.selectedRangeOption = this.dateRangeOptions.find(o => o.value === '30');
        }
      },
      editRoute(sessionId) {
        return {
          name: PageNames.ATTENDANCE_EDIT,
          params: {
            classId: this.$route.params.classId,
            attendanceId: sessionId,
          },
        };
      },
      formatDateTime(isoString) {
        return this.formatAttendanceDateTime(isoString);
      },
      presentCount(session) {
        return session.attendance_records.filter(r => r.present).length;
      },
      absentCount(session) {
        return session.attendance_records.filter(r => !r.present).length;
      },
    },
    $trs: {
      backToClass: {
        message: 'Back to \u2018{className}\u2019',
        context:
          'Navigation link to return to the class home page, where {className} is the class name.',
      },
      dateRange: {
        message: 'Date range',
        context: 'Label for the date range filter dropdown in attendance history.',
      },
      past7Days: {
        message: 'Past 7 days',
        context: 'Date range filter option for the last 7 days.',
      },
      past30Days: {
        message: 'Past 30 days',
        context: 'Date range filter option for the last 30 days (default).',
      },
      past365Days: {
        message: 'Past 365 days',
        context: 'Date range filter option for the last 365 days.',
      },
      allTime: {
        message: 'All time',
        context: 'Date range filter option to show all attendance sessions.',
      },
      customRange: {
        message: 'Custom',
        context: 'Date range filter option to select a custom date range.',
      },
      customRangeLabel: {
        message: '{startDate} – {endDate}',
        context:
          'Label for the applied custom date range, where {startDate} and {endDate} are formatted dates.',
      },
      startDate: {
        message: 'Start date',
        context: 'Label for the start date input in the custom date range picker.',
      },
      endDate: {
        message: 'End date',
        context: 'Label for the end date input in the custom date range picker.',
      },
      applyFilter: {
        message: 'Apply',
        context: 'Button label to apply the custom date range filter.',
      },
      previousMonth: {
        message: 'Previous month',
        context:
          'Label for the previous month navigation button in the date range calendar picker.',
      },
      nextMonth: {
        message: 'Next month',
        context: 'Label for the next month navigation button in the date range calendar picker.',
      },
      dateColumn: {
        message: 'Date',
        context: 'Table column header for the session date and time.',
      },
      present: {
        message: 'Present',
        context: 'Table column header for the count of present learners.',
      },
      absent: {
        message: 'Absent',
        context: 'Table column header for the count of absent learners.',
      },
      noSessions: {
        message: 'No attendance sessions found',
        context: 'Message shown when no attendance sessions match the selected date range.',
      },
      invalidDateError: {
        message: 'Please enter a valid date',
        context: 'Error message shown when a date is not in the correct format.',
      },
      startDateAfterEndDateError: {
        message: 'Start date must be before end date',
        context: 'Error message shown when the start date is after the end date.',
      },
      futureDateError: {
        message: 'Cannot select a future date',
        context: 'Error message shown when a future date is selected.',
      },
      dateBeforeFirstAllowedError: {
        message: 'Date is before the earliest allowed date',
        context: 'Error message shown when a date is before the first allowed date.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .back-link {
    display: inline-block;
    margin-bottom: 8px;
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .header-row h1 {
    margin: 0;
  }

  .filter-row {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
  }

  .date-range-select {
    width: 200px;
  }

  .pagination-nav {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .pagination-label {
    margin-right: 8px;
  }

</style>
