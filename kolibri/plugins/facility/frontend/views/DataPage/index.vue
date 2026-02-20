<template>

  <FacilityAppBarPage>
    <KPageContainer v-if="canUploadDownloadFiles">
      <p>
        <KRouterLink
          v-if="userIsMultiFacilityAdmin"
          :to="{
            name: facilityPageLinks.AllFacilitiesPage.name,
            params: { subtopicName: 'DataPage' },
          }"
          icon="back"
          :text="coreString('changeLearningFacility')"
        />
      </p>
      <KGrid gutter="24">
        <KGridItem>
          <h1>{{ $tr('pageHeading') }}</h1>
        </KGridItem>

        <KGridItem>
          <p>{{ $tr('pageSubHeading') }}</p>
        </KGridItem>

        <KGridItem :layout12="{ span: 6 }">
          <h3 class="subheading">
            {{ $tr('detailsHeading') }}
          </h3>
          <p class="subheading-desc">
            {{ $tr('detailsSubHeading') }}
          </p>
          <p class="subheading-desc">
            <KButton
              appearance="basic-link"
              :text="$tr('LearnMore')"
              @click="showLearnMoreSessionModal = true"
            />
          </p>
          <p
            class="generated-time"
            :style="{ color: $themeTokens.annotation }"
          >
            <GeneratedElapsedTime
              v-if="sessionDateCreated"
              :date="sessionDateCreated"
            />
          </p>
        </KGridItem>

        <KGridItem
          class="session-section-buttons"
          :class="windowSizeStyle"
          :layout12="{ span: 6, alignment: 'right' }"
        >
          <KButton
            v-if="availableSessionCSVLog"
            class="subheading-buttons"
            :style="windowIsMedium || windowIsSmall ? { order: 2 } : { order: 1 }"
            appearance="flat-button"
            :text="$tr('download')"
            @click="downloadSessionLog"
          />
          <p v-if="inSessionCSVCreation">
            <DataPageTaskProgress>{{ $tr('generatingLog') }}</DataPageTaskProgress>
          </p>
          <KButton
            v-else
            class="subheading-buttons"
            :text="$tr('generateLogButtonText')"
            @click="sessionDateRangeModal = true"
          />
        </KGridItem>
        <KGridItem>
          <p
            class="section-seperator"
            :style="{
              borderBottom: `1px solid ${$themeTokens.fineLine}`,
            }"
          ></p>
        </KGridItem>

        <KGridItem :layout12="{ span: 6 }">
          <h3 class="subheading">
            {{ $tr('summaryHeading') }}
          </h3>
          <p class="subheading-desc">
            {{ $tr('summarySubHeading') }}
          </p>
          <p class="subheading-desc">
            <KButton
              appearance="basic-link"
              :text="$tr('LearnMore')"
              @click="showLearnMoreSummaryModal = true"
            />
          </p>
          <p
            class="generated-time"
            :style="{ color: $themeTokens.annotation }"
          >
            <GeneratedElapsedTime
              v-if="summaryDateCreated"
              :date="summaryDateCreated"
            />
          </p>
        </KGridItem>

        <KGridItem
          class="summary-section-buttons"
          :class="windowSizeStyle"
          :layout12="{ span: 6, alignment: 'right' }"
        >
          <KButton
            v-if="availableSummaryCSVLog"
            class="subheading-buttons"
            :style="windowIsMedium || windowIsSmall ? { order: 2 } : { order: 1 }"
            appearance="flat-button"
            :text="$tr('download')"
            @click="downloadSummaryLog"
          />
          <p v-if="inSummaryCSVCreation">
            <DataPageTaskProgress>{{ $tr('generatingLog') }}</DataPageTaskProgress>
          </p>
          <KButton
            v-else
            class="subheading-buttons"
            :text="$tr('generateLogButtonText')"
            @click="summaryDateRangeModal = true"
          />
        </KGridItem>
      </KGrid>
    </KPageContainer>

    <ImportInterface v-if="canUploadDownloadFiles" />
    <SyncInterface />

    <LearnMoreModal
      v-if="showLearnMoreSummaryModal"
      logType="summary"
      @cancel="showLearnMoreSummaryModal = false"
      @submit="showLearnMoreSummaryModal = false"
    />

    <LearnMoreModal
      v-if="showLearnMoreSessionModal"
      logType="session"
      @cancel="showLearnMoreSessionModal = false"
      @submit="showLearnMoreSessionModal = false"
    />

    <KDateRange
      v-if="summaryDateRangeModal"
      class="generate-calendar"
      :firstAllowedDate="firstAllowedDate"
      :lastAllowedDate="lastAllowedDate"
      :defaultStartDate="summaryDateCreated"
      :submitText="$tr('submitText')"
      :cancelText="coreString('cancelAction')"
      :title="$tr('title')"
      :description="$tr('description')"
      :dateLocale="selectedLanguage"
      :startDateLegendText="$tr('startDateLegendText')"
      :endDateLegendText="$tr('endDateLegendText')"
      :previousMonthText="$tr('previousMonthText')"
      :nextMonthText="$tr('nextMonthText')"
      v-bind="errorMessages"
      @submit="generateSummaryLog"
      @cancel="summaryDateRangeModal = false"
    />
    <KDateRange
      v-if="sessionDateRangeModal"
      class="generate-calendar"
      :firstAllowedDate="firstAllowedDate"
      :lastAllowedDate="lastAllowedDate"
      :defaultStartDate="sessionDateCreated"
      :submitText="$tr('submitText')"
      :cancelText="coreString('cancelAction')"
      :title="$tr('title')"
      :description="$tr('description')"
      :dateLocale="selectedLanguage"
      :startDateLegendText="$tr('startDateLegendText')"
      :endDateLegendText="$tr('endDateLegendText')"
      :previousMonthText="$tr('previousMonthText')"
      :nextMonthText="$tr('nextMonthText')"
      v-bind="errorMessages"
      @submit="generateSessionLog"
      @cancel="sessionDateRangeModal = false"
    />
  </FacilityAppBarPage>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import useUser from 'kolibri/composables/useUser';
  import urls from 'kolibri/urls';
  import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import validationConstants from 'kolibri-design-system/lib/KDateRange/validationConstants';
  import { currentLanguage } from 'kolibri/utils/i18n';
  import { now } from 'kolibri/utils/serverClock';
  import format from 'date-fns/format';
  import KDateRange from 'kolibri-design-system/lib/KDateRange';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { PageNames } from '../../constants';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import GeneratedElapsedTime from './GeneratedElapsedTime';
  import DataPageTaskProgress from './DataPageTaskProgress';
  import SyncInterface from './SyncInterface';
  import ImportInterface from './ImportInterface';
  import LearnMoreModal from './LearnMoreModal.vue';

  export default {
    name: 'DataPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      FacilityAppBarPage,
      DataPageTaskProgress,
      GeneratedElapsedTime,
      ImportInterface,
      SyncInterface,
      LearnMoreModal,
      KDateRange,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsMedium, windowIsSmall } = useKResponsiveWindow();
      const { isAppContext } = useUser();
      const { userIsMultiFacilityAdmin } = useFacilities();
      return { windowIsMedium, windowIsSmall, isAppContext, userIsMultiFacilityAdmin };
    },
    data() {
      return {
        showLearnMoreSummaryModal: false,
        showLearnMoreSessionModal: false,
        summaryDateRangeModal: false,
        sessionDateRangeModal: false,
        lastAllowedDate: now(),
        selectedLanguage: currentLanguage,
        dateRange: {},
      };
    },
    computed: {
      ...mapGetters('manageCSV', [
        'availableSessionCSVLog',
        'availableSummaryCSVLog',
        'inSessionCSVCreation',
        'inSummaryCSVCreation',
        'firstLogDate',
      ]),
      ...mapGetters(['activeFacilityId', 'facilityPageLinks']),
      ...mapState('manageCSV', ['sessionDateCreated', 'summaryDateCreated']),
      // NOTE: We disable CSV file upload/download on embedded web views like the Mac
      // and Android apps
      canUploadDownloadFiles() {
        return !this.isAppContext;
      },
      pollForTasks() {
        return this.$route.name === PageNames.DATA_EXPORT_PAGE;
      },
      windowSizeStyle() {
        if (this.windowIsMedium || this.windowIsSmall) {
          return 'section-buttons-flex';
        }
        return {};
      },
      firstAllowedDate() {
        // setting firstAllowedDate to firstLogDate minus one day
        // because KDateRange prop firstAllowedDate is not inclusive
        const firstAllowed = this.firstLogDate;
        const day = this.firstLogDate.getDate() - 1;
        return new Date(firstAllowed.setDate(day));
      },
      errorMessages() {
        return {
          [validationConstants.MALFORMED]: this.$tr('invalidateDateError'),
          [validationConstants.START_DATE_AFTER_END_DATE]: this.$tr('startDateAfterEndDateError'),
          [validationConstants.FUTURE_DATE]: this.$tr('futureDateError'),
          [validationConstants.DATE_BEFORE_FIRST_ALLOWED]: this.$tr('beforeFirstAllowedDateError', {
            date: format(this.firstAllowedDate, 'DD/MM/YYYY'),
          }),
        };
      },
    },
    watch: {
      pollForTasks(val) {
        return val ? this.startTaskPolling() : this.stopTaskPolling();
      },
    },
    mounted() {
      // fetch task list after fetching facilities, to ensure proper syncing state
      FacilityResource.fetchCollection({ force: true }).then(facilities => {
        this.$store.commit('manageCSV/RESET_STATE');
        this.$store.commit('manageCSV/SET_STATE', { facilities });
        if (this.pollForTasks) {
          this.refreshTaskList();
          this.startTaskPolling();
        }
      });
    },
    destroyed() {
      this.stopTaskPolling();
    },
    methods: {
      ...mapActions('manageCSV', [
        'startSummaryCSVExport',
        'startSessionCSVExport',
        'refreshTaskList',
        'getExportedCSVsInfo',
        'getFirstLogDate',
      ]),
      generateSessionLog(dates) {
        this.sessionDateRangeModal = false;
        this.updateDateRange(dates);
        this.startSessionCSVExport(this.dateRange);
      },
      generateSummaryLog(dates) {
        this.summaryDateRangeModal = false;
        this.updateDateRange(dates);
        this.startSummaryCSVExport(this.dateRange);
      },
      updateDateRange(dates) {
        const start_date = dates['start'];
        const end_date = dates['end'];
        this.dateRange = {
          start: new Date(
            start_date.getTime() - start_date.getTimezoneOffset() * 60000,
          ).toISOString(),
          end: new Date(end_date.getTime() - end_date.getTimezoneOffset() * 60000).toISOString(),
        };
      },
      startTaskPolling() {
        this.getExportedCSVsInfo();
        this.getFirstLogDate();
        if (!this.intervalId) {
          this.intervalId = setInterval(this.refreshTaskList, 1000);
        }
      },
      stopTaskPolling() {
        if (this.intervalId) {
          this.intervalId = clearInterval(this.intervalId);
        }
      },
      downloadSessionLog() {
        window.open(
          urls['kolibri:kolibri.plugins.facility:download_csv_file'](
            'session',
            this.activeFacilityId,
          ),
          '_blank',
        );
      },
      downloadSummaryLog() {
        window.open(
          urls['kolibri:kolibri.plugins.facility:download_csv_file'](
            'summary',
            this.activeFacilityId,
          ),
          '_blank',
        );
      },
    },
    $trs: {
      detailsHeading: {
        message: 'Session logs',
        context: "'Session logs' refer to individual visits to each resource made by a user.",
      },
      detailsSubHeading: {
        message: 'Individual visits to each resource.',
        context: "Description of 'Session logs'.",
      },
      documentTitle: {
        message: 'Manage Data',
        context: 'Refers to the page title of the Facility > Data section of Kolibri.',
      },
      download: {
        message: 'Download',
        context: 'Button used to download logs contained in CSV files.',
      },
      generateLogButtonText: {
        message: 'Generate log',
        context:
          "Option to generate a log file which can then be downloaded in CSV format.\n\nWhen there are no logs, this string is displayed, after the user generates logs, the string is replaced with 'Generate a new log file'.",
      },
      generatingLog: {
        message: 'Generating log file...',
        context:
          "Message that displays when user clicks on 'Generate a new log file'. Log files contain information about users and their interactions with the resources on the device.",
      },
      pageHeading: {
        message: 'Export usage data',
        context: 'Heading for the Facilty > Data page.',
      },
      pageSubHeading: {
        message:
          'Download CSV (comma-separated value) files containing information about users and their interactions with the resources on this device',
        context: "Description of the 'Export usage data' page.\n",
      },
      summaryHeading: {
        message: 'Summary logs',
        context:
          'Summary logs record the total time and progress each user has achieved for each resource.',
      },
      summarySubHeading: {
        message: 'Total time/progress for each resource.',
        context: "Description of 'Summary logs'.",
      },
      LearnMore: {
        message: 'Learn more',
        context: 'Message that displays session or summary log information\n',
      },
      submitText: {
        message: 'Generate',
        context: 'Submission text of calendar modal',
      },
      title: {
        message: 'Select a date range',
        context: 'Title of calendar modal',
      },
      description: {
        message: 'The default start date is the last time you exported this log',
        context: 'Description of modal',
      },
      startDateLegendText: {
        message: 'Start date',
        context: 'Start date input label for calendar modal',
      },
      endDateLegendText: {
        message: 'End date',
        context: 'End date input label for calendar modal',
      },
      previousMonthText: {
        message: 'Previous month',
        context: 'label for previous month button',
      },
      nextMonthText: {
        message: 'Next month',
        context: 'label for next month button',
      },
      invalidateDateError: {
        message: 'Please enter a valid date',
        context: 'Error message displayed when an invalid date is entered',
      },
      startDateAfterEndDateError: {
        message: 'Start date cannot be after end date',
        context: 'Error message displayed when the start date is after the end date',
      },
      futureDateError: {
        message: 'You cannot select a future date',
        context: 'Error message displayed when an unavailable future date is entered',
      },
      beforeFirstAllowedDateError: {
        message: 'Date must be after {date}',
        context: 'Error message displayed when the input date is before the first allowed date',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  /deep/ .page-container p {
    font-size: 0.93em;
  }

  .subheading {
    margin-top: 10px;
    margin-bottom: 5px;
    font-size: 0.93em;
  }

  .subheading-desc {
    display: inline-block;
    margin: 0 0.313rem 0.313rem 0;
  }

  .subheading-buttons {
    display: inline-block;
    margin-right: 0.313rem;
  }

  .generated-time {
    margin: 0.313rem 0;
  }

  .section-seperator {
    margin: 0.313rem 0;
  }

  .session-section-buttons {
    padding-top: 20px;
    padding-bottom: 15px;
  }

  .summary-section-buttons {
    padding-top: 20px;
  }

  // conditional class to support KButton order style; based on computed prop windowSizeStyle
  /deep/ .section-buttons-flex div {
    display: flex;
  }

  .generate-calendar /deep/ .months-text {
    font-family: 'noto-full', 'noto-subset', 'noto-common', sans-serif;
  }

</style>
