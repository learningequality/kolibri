<template>

  <FacilityAppBarPage>

    <KPageContainer v-if="canUploadDownloadFiles">
      <KGrid gutter="48">

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
          <p class="generated-time" :style="{ color: $themeTokens.annotation }">
            <GeneratedElapsedTime v-if="sessionDateCreated" :date="sessionDateCreated" />
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
            @click="generateSessionLog"
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
          <p class="generated-time" :style="{ color: $themeTokens.annotation }">
            <GeneratedElapsedTime v-if="summaryDateCreated" :date="summaryDateCreated" />
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
            @click="generateSummaryLog"
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

  </FacilityAppBarPage>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  import urls from 'kolibri.urls';
  import { FacilityResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
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
    },
    mixins: [commonCoreStrings, KResponsiveWindowMixin],
    data() {
      return {
        showLearnMoreSummaryModal: false,
        showLearnMoreSessionModal: false,
      };
    },
    computed: {
      ...mapGetters('manageCSV', [
        'availableSessionCSVLog',
        'availableSummaryCSVLog',
        'inSessionCSVCreation',
        'inSummaryCSVCreation',
      ]),
      ...mapGetters(['activeFacilityId']),
      ...mapState('manageCSV', ['sessionDateCreated', 'summaryDateCreated']),
      // NOTE: We disable CSV file upload/download on embedded web views like the Mac
      // and Android apps
      canUploadDownloadFiles() {
        return !isEmbeddedWebView;
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
      ]),
      generateSessionLog() {
        this.startSessionCSVExport();
      },
      generateSummaryLog() {
        this.startSummaryCSVExport();
      },
      startTaskPolling() {
        this.getExportedCSVsInfo();
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
            this.activeFacilityId
          ),
          '_blank'
        );
      },
      downloadSummaryLog() {
        window.open(
          urls['kolibri:kolibri.plugins.facility:download_csv_file'](
            'summary',
            this.activeFacilityId
          ),
          '_blank'
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
        message: 'Learn More',
        context: 'Message that displays session or summary log information\n',
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

</style>
