<template>

  <CoachAppBarPage :loading="pageLoading">
    <KPageContainer>
      <BackLink
        :to="classHomeLink"
        :text="backToClassLabel$()"
      />
      <KGrid>
        <KGridItem
          :layout4="{ span: 4 }"
          :layout8="{ span: 5 }"
          :layout12="{ span: 9 }"
        >
          <h1>{{ attendanceHistoryTitle$() }}</h1>
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout4="{ span: 4 }"
          :layout8="{ span: 3 }"
          :layout12="{ span: 3 }"
        >
          <KRouterLink
            :text="markAttendanceAction$()"
            :primary="true"
            :to="markAttendanceLink"
            appearance="raised-button"
          />
        </KGridItem>
      </KGrid>

      <ReportsControls @export="exportCSV">
        <KSelect
          :label="dateRangeLabel$()"
          :options="dateRangeOptions"
          :inline="true"
          :value="selectedDateRange"
          @change="handleDateRangeChange"
        />
      </ReportsControls>

      <KDateRange
        v-if="showDateRangePicker"
        :lastAllowedDate="today"
        :submitText="applyLabel$()"
        :cancelText="coreString('cancelAction')"
        :title="customDateRangeTitle$()"
        :description="customDateRangeDescription$()"
        :startDateLegendText="startDateLabel$()"
        :endDateLegendText="endDateLabel$()"
        :previousMonthText="previousMonthLabel$()"
        :nextMonthText="nextMonthLabel$()"
        @submit="handleCustomDateSubmit"
        @cancel="showDateRangePicker = false"
      />

      <KTable
        :headers="tableHeaders"
        :rows="tableRows"
        :caption="attendanceHistoryTitle$()"
        :emptyMessage="noSessionsFoundMessage$()"
        :dataLoading="attendanceLoading"
        :stickyColumns="['first']"
      >
        <template #cell="{ content, colIndex, rowIndex }">
          <KRouterLink
            v-if="colIndex === 0"
            :text="content"
            :to="editSessionLink(rowIndex)"
          />
          <template v-else>
            {{ content }}
          </template>
        </template>
      </KTable>

      <PaginationActions
        v-if="totalPages > 1"
        v-model="currentPage"
        class="pagination-actions"
        :itemsPerPage="PAGE_SIZE"
        :totalPageNumber="totalPages"
        :numFilteredItems="sessionCount"
      />
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { ref, computed, watch, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';
  import { attendanceStrings } from 'kolibri-common/strings/attendanceStrings';
  import AttendanceSessionResource from 'kolibri-common/apiResources/AttendanceSessionResource';
  import PaginationActions from 'kolibri-common/components/PaginationActions';
  import usePagination from 'kolibri-common/composables/usePagination';
  import KDateRange from 'kolibri-design-system/lib/KDateRange';
  import { now } from 'kolibri/utils/serverClock';
  import { DateRangeFilters } from 'kolibri-common/constants/DateRangeFilters';
  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import { PageNames } from '../../constants';
  import CoachAppBarPage from '../CoachAppBarPage';
  import BackLink from '../common/BackLink';
  import ReportsControls from '../common/ReportsControls';
  import useCoreCoach from '../../composables/useCoreCoach';
  import { useAttendance } from '../../composables/useAttendance';
  import CSVExporter from '../../csv/exporter';

  const PAGE_SIZE = 10;

  const FILTER_DAYS_MAP = {
    [DateRangeFilters.LAST_7_DAYS]: 7,
    [DateRangeFilters.LAST_30_DAYS]: 30,
    [DateRangeFilters.LAST_365_DAYS]: 365,
  };

  export default {
    name: 'AttendanceHistoryPage',
    components: {
      BackLink,
      CoachAppBarPage,
      KDateRange,
      PaginationActions,
      ReportsControls,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();
      const { createSnackbar } = useSnackbar();
      const { classId, className } = useCoreCoach();

      const { attendanceLoading, sessions, totalPages, sessionCount, fetchSessions } =
        useAttendance();

      const { currentPage } = usePagination();

      const {
        markAttendanceAction$,
        noSessionsFoundMessage$,
        dateLabel$,
        $formatDate,
        attendanceHistoryTitle$,
        backToClassLabel$,
        dateRangeLabel$,
        pastDays$,
        allTime$,
        customLabel$,
        customDateRangeTitle$,
        customDateRangeDescription$,
        startDateLabel$,
        endDateLabel$,
        previousMonthLabel$,
        nextMonthLabel$,
        applyLabel$,
        presentColumnHeader$,
        absentColumnHeader$,
      } = attendanceStrings;

      const today = now();
      const showDateRangePicker = ref(false);
      const customStartDate = ref(null);
      const customEndDate = ref(null);

      const customDateLabel = computed(() => {
        if (customStartDate.value && customEndDate.value) {
          return `${$formatDate(customStartDate.value)} \u2013 ${$formatDate(customEndDate.value)}`;
        }
        return null;
      });

      const baseOptions = [
        { label: pastDays$({ count: 7 }), value: DateRangeFilters.LAST_7_DAYS },
        { label: pastDays$({ count: 30 }), value: DateRangeFilters.LAST_30_DAYS },
        { label: pastDays$({ count: 365 }), value: DateRangeFilters.LAST_365_DAYS },
        { label: allTime$(), value: DateRangeFilters.ALL_TIME },
        { label: customLabel$(), value: DateRangeFilters.CUSTOM },
      ];

      const dateRangeOptions = computed(() => {
        if (customDateLabel.value) {
          return [
            ...baseOptions.filter(o => o.value !== DateRangeFilters.CUSTOM),
            { label: customDateLabel.value, value: DateRangeFilters.CUSTOM_APPLIED },
            { label: customLabel$(), value: DateRangeFilters.CUSTOM },
          ];
        }
        return baseOptions;
      });

      const selectedDateRange = ref(
        baseOptions.find(o => o.value === DateRangeFilters.LAST_30_DAYS),
      );

      onMounted(() => {
        const { snackbar, ...query } = route.query;
        if (snackbar) {
          createSnackbar(snackbar);
          router.replace({
            name: route.name,
            params: route.params,
            query,
          });
        }
      });

      function getDateRange(filterValue) {
        if (filterValue === DateRangeFilters.CUSTOM_APPLIED) {
          // KDateRange returns dates at midnight (start of day). The backend
          // end_date filter uses exclusive lt, so we send midnight of the NEXT
          // day to include all sessions on the selected end date (#14424).
          const exclusiveEnd = new Date(customEndDate.value);
          exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
          return {
            start_date: customStartDate.value.toISOString(),
            end_date: exclusiveEnd.toISOString(),
          };
        }
        if (filterValue === DateRangeFilters.ALL_TIME) {
          return {};
        }
        const days = FILTER_DAYS_MAP[filterValue];
        if (!days) {
          return {};
        }
        const currentDate = now();
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - days);
        return {
          start_date: startDate.toISOString(),
          end_date: currentDate.toISOString(),
        };
      }

      function loadSessions() {
        const dateParams = getDateRange(selectedDateRange.value.value);
        return fetchSessions(classId.value, {
          page_size: PAGE_SIZE,
          page: currentPage.value,
          ...dateParams,
        });
      }

      // Navigation links
      const classHomeLink = computed(() => ({
        name: PageNames.HOME_PAGE,
        params: { classId: classId.value },
      }));

      const markAttendanceLink = computed(() => ({
        name: PageNames.ATTENDANCE_NEW,
        params: { classId: classId.value },
      }));

      function editSessionLink(rowIndex) {
        const session = sessions.value[rowIndex];
        return {
          name: PageNames.ATTENDANCE_EDIT,
          params: { classId: classId.value, attendanceId: session ? session.id : '' },
        };
      }

      // Table configuration
      const tableHeaders = [
        { label: dateLabel$(), dataType: 'date', minWidth: '200px', columnId: 'date' },
        {
          label: presentColumnHeader$(),
          dataType: 'number',
          minWidth: '100px',
          columnId: 'present',
        },
        {
          label: absentColumnHeader$(),
          dataType: 'number',
          minWidth: '100px',
          columnId: 'absent',
        },
      ];

      const dateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      };

      function processSessionData(rawSessions) {
        return rawSessions.map(session => {
          const totalCount = session.total_count || 0;
          const presentCount = session.present_count || 0;
          return {
            date: $formatDate(new Date(session.session_start_datetime), dateTimeFormatOptions),
            present: presentCount,
            absent: totalCount - presentCount,
          };
        });
      }

      const processedSessions = computed(() => {
        return processSessionData(sessions.value);
      });

      const tableRows = computed(() => {
        return processedSessions.value.map(row => [row.date, row.present, row.absent]);
      });

      function fetchAllSessionPages(params) {
        const pageNumbers = Array.from({ length: totalPages.value }, (_, i) => i + 1);
        return Promise.all(
          pageNumbers.map(page =>
            AttendanceSessionResource.fetchCollection({
              getParams: { collection: classId.value, ...params, page },
              force: true,
            }).then(data => data.results),
          ),
        ).then(pages => pages.flat());
      }

      function exportCSV() {
        const dateParams = getDateRange(selectedDateRange.value.value);
        const params = { ...dateParams, page_size: PAGE_SIZE };

        fetchAllSessionPages(params).then(allSessions => {
          const columns = [
            { name: dateLabel$(), key: 'date' },
            { name: presentColumnHeader$(), key: 'present' },
            { name: absentColumnHeader$(), key: 'absent' },
          ];
          const exporter = new CSVExporter(columns, className.value);
          exporter.addNames({
            report: attendanceHistoryTitle$(),
            date: $formatDate(today, { year: 'numeric', month: 'short', day: 'numeric' }),
          });
          exporter.export(processSessionData(allSessions));
        });
      }

      // Fetch sessions whenever page changes (immediate: true handles initial load)
      watch(
        currentPage,
        () => {
          loadSessions();
        },
        { immediate: true },
      );

      function resetAndLoad() {
        if (currentPage.value === 1) {
          loadSessions();
        } else {
          currentPage.value = 1;
        }
      }

      // Filter handlers
      function handleDateRangeChange(option) {
        if (option.value === DateRangeFilters.CUSTOM) {
          showDateRangePicker.value = true;
          return;
        }
        selectedDateRange.value = option;
        resetAndLoad();
      }

      function handleCustomDateSubmit({ start, end }) {
        showDateRangePicker.value = false;
        customStartDate.value = start;
        customEndDate.value = end;
        selectedDateRange.value = {
          label: customDateLabel.value,
          value: DateRangeFilters.CUSTOM_APPLIED,
        };
        resetAndLoad();
      }

      return {
        pageLoading,
        PAGE_SIZE,
        attendanceLoading,
        classHomeLink,
        markAttendanceLink,
        editSessionLink,
        tableHeaders,
        tableRows,
        dateRangeOptions,
        selectedDateRange,
        showDateRangePicker,
        today,
        totalPages,
        sessionCount,
        currentPage,
        handleDateRangeChange,
        handleCustomDateSubmit,
        attendanceHistoryTitle$,
        backToClassLabel$,
        markAttendanceAction$,
        noSessionsFoundMessage$,
        dateRangeLabel$,
        customDateRangeTitle$,
        customDateRangeDescription$,
        startDateLabel$,
        endDateLabel$,
        previousMonthLabel$,
        nextMonthLabel$,
        applyLabel$,
        coreString,
        exportCSV,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .pagination-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

</style>
