<template>

  <div>
    <KPageContainer v-if="canUploadDownloadFiles">
      <KGrid gutter="48">

        <KGridItem>
          <h1>{{ $tr('pageHeading') }}</h1>
        </KGridItem>

        <KGridItem>
          <p>{{ $tr('pageSubHeading') }}</p>
        </KGridItem>

        <KGridItem :layout8="{ span: 4 }" :layout12="{ span: 6 }">
          <h2>{{ $tr('detailsHeading') }}</h2>
          <p>{{ $tr('detailsSubHeading') }}</p>
          <p>
            <KButton
              :text="$tr('download')"
              style="margin-right: 8px;"
              :disabled="!availableSessionCSVLog"
              @click="downloadSessionLog"
            />
            <span v-if="noSessionLogs">{{ $tr('noLogsYet') }}</span>
            <GeneratedElapsedTime v-else-if="sessionDateCreated" :date="sessionDateCreated" />
          </p>
          <p v-if="!canUploadDownloadFiles" :style="noDlStyle">
            {{ $tr('noDownload') }}
          </p>
          <p v-else-if="inSessionCSVCreation">
            <DataPageTaskProgress>{{ $tr('generatingLog') }}</DataPageTaskProgress>
          </p>
          <p v-else>

            <KButton
              appearance="basic-link"
              :text="noSessionLogs ? $tr('generateLog') : $tr('regenerateLog')"
              @click="generateSessionLog"
            />
          </p>
          <p class="infobox">
            <b>{{ $tr('note') }}</b> {{ $tr('detailsInfo') }}
          </p>
        </KGridItem>

        <KGridItem :layout8="{ span: 4 }" :layout12="{ span: 6 }">
          <h2>{{ $tr('summaryHeading') }}</h2>
          <p>{{ $tr('summarySubHeading') }}</p>
          <p>
            <KButton
              :text="$tr('download')"
              style="margin-right: 8px;"
              :disabled="!availableSummaryCSVLog"
              @click="downloadSummaryLog"
            />
            <span v-if="noSummaryLogs">{{ $tr('noLogsYet') }}</span>
            <GeneratedElapsedTime v-else-if="summaryDateCreated" :date="summaryDateCreated" />
          </p>
          <p v-if="!canUploadDownloadFiles" :style="noDlStyle">
            {{ $tr('noDownload') }}
          </p>
          <p v-else-if="inSummaryCSVCreation">
            <DataPageTaskProgress>{{ $tr('generatingLog') }}</DataPageTaskProgress>
          </p>
          <p v-else>
            <KButton
              appearance="basic-link"
              :text="noSummaryLogs ? $tr('generateLog') : $tr('regenerateLog')"
              @click="generateSummaryLog"
            />
          </p>
          <p class="infobox">
            <b>{{ $tr('note') }}</b> {{ $tr('summaryInfo') }}
          </p>
        </KGridItem>

      </KGrid>
    </KPageContainer>

    <ImportInterface v-if="canUploadDownloadFiles" />
    <SyncInterface />

  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';
  import urls from 'kolibri.urls';
  import { FacilityResource } from 'kolibri.resources';
  import { PageNames } from '../../constants';
  import GeneratedElapsedTime from './GeneratedElapsedTime';
  import DataPageTaskProgress from './DataPageTaskProgress';
  import SyncInterface from './SyncInterface';
  import ImportInterface from './ImportInterface';

  export default {
    name: 'DataPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      GeneratedElapsedTime,
      DataPageTaskProgress,
      SyncInterface,
      ImportInterface,
    },
    computed: {
      ...mapGetters('manageCSV', [
        'inSessionCSVCreation',
        'inSummaryCSVCreation',
        'noSessionLogs',
        'noSummaryLogs',
        'availableSessionCSVLog',
        'availableSummaryCSVLog',
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
      noDlStyle() {
        return {
          color: this.$themeTokens.annotation,
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
        'getExportedLogsInfo',
      ]),
      generateSessionLog() {
        this.startSessionCSVExport();
      },
      generateSummaryLog() {
        this.startSummaryCSVExport();
      },
      startTaskPolling() {
        this.getExportedLogsInfo();
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
          urls['kolibri:core:download_csv_file']('session', this.activeFacilityId),
          '_blank'
        );
      },
      downloadSummaryLog() {
        window.open(
          urls['kolibri:core:download_csv_file']('summary', this.activeFacilityId),
          '_blank'
        );
      },
    },
    $trs: {
      pageHeading: {
        message: 'Export usage data',
        context: 'Heading for the Facilty > Data page.',
      },
      pageSubHeading: {
        message:
          'Download CSV (comma-separated value) files containing information about users and their interactions with the resources on this device',
        context: "Description of the 'Export usage data' page.\n",
      },
      detailsHeading: {
        message: 'Session logs',
        context: "'Session logs' refer to individual visits to each resource.",
      },
      detailsSubHeading: {
        message: 'Individual visits to each resource',
        context: "Description of 'Session logs'.",
      },
      summaryHeading: {
        message: 'Summary logs',
        context:
          'Summary logs record the total time and progress each user has achieved for each resource.',
      },
      summarySubHeading: {
        message: 'Total time/progress for each resource',
        context: "Description of 'Summary logs'.",
      },
      detailsInfo: {
        message:
          'When a user views a resource, we record how long they spend and the progress they make. Each row in this file records a single visit a user made to a specific resource. This includes anonymous usage, when no user is signed in.',
        context: "Detailed explanation of 'Session logs'.",
      },
      summaryInfo: {
        message:
          'A user may visit the same resource multiple times. This file records the total time and progress each user has achieved for each resource, summarized across possibly more than one visit. Anonymous usage is not included.',
        context: "Detailed explanation of 'Summary logs'.\n",
      },
      generateLog: 'Generate log file',
      regenerateLog: {
        message: 'Generate a new log file',
        context: 'Option to generate a log file which can then be downloaded in CSV format.',
      },
      noLogsYet: {
        message: 'No logs are available to download.',
        context: "Message that displays if no logs are available yet in the user's facility.",
      },
      download: {
        message: 'Download',
        context: 'Button used to download logs contained in CSV files.',
      },
      note: {
        message: 'Note:',
        context: 'Precedes the more detailed explanation of what logs are.\n',
      },
      noDownload: {
        message: 'Download is not supported on Android',
        context: 'Android specific message.',
      },
      documentTitle: {
        message: 'Manage Data',
        context: 'Refers to the page title of the Facility > Data section of Kolibri.',
      },
      generatingLog: {
        message: 'Generating log file...',
        context: "Message that displays when user clicks on 'Generate a new log file'.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .infobox {
    padding: 8px;
    margin-right: -8px;
    margin-left: -8px;
    font-size: 0.8em;
    border-radius: $radius;
  }

</style>
