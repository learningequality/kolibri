<template>

  <div>
    <KPageContainer v-if="!cannotDownload">
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
              :disabled="!availableSessionCSVLog"
              class="download-button"
              @click="downloadSessionLog"
            />
          </p>
          <p v-if="cannotDownload" :style="noDlStyle">
            {{ $tr('noDownload') }}
          </p>
          <p v-else-if="inSessionCSVCreation">
            <DataPageTaskProgress />
          </p>
          <p v-else>
            <span v-if="noSessionLogs"> {{ $tr('noLogsYet') }} </span>
            <GeneratedElapsedTime v-else :date="sessionDateCreated" />
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
              :disabled="!availableSummaryCSVLog"
              class="download-button"
              @click="downloadSummaryLog"
            />
          </p>
          <p v-if="cannotDownload" :style="noDlStyle">
            {{ $tr('noDownload') }}
          </p>
          <p v-else-if="inSummaryCSVCreation">
            <DataPageTaskProgress />
          </p>
          <p v-else>
            <span v-if="noSummaryLogs"> {{ $tr('noLogsYet') }} </span>
            <GeneratedElapsedTime v-else :date="summaryDateCreated" />
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

    <SyncInterface />
  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { isEmbeddedWebView } from 'kolibri.utils.browser';
  import urls from 'kolibri.urls';
  import { FacilityResource } from 'kolibri.resources';
  import { PageNames } from '../../constants';
  import GeneratedElapsedTime from './GeneratedElapsedTime';
  import DataPageTaskProgress from './DataPageTaskProgress';
  import SyncInterface from './SyncInterface';

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
      ...mapState(['pageName']),
      ...mapState('manageCSV', ['sessionDateCreated', 'summaryDateCreated']),
      cannotDownload() {
        return isEmbeddedWebView();
      },
      inDataExportPage() {
        return this.pageName === PageNames.DATA_EXPORT_PAGE;
      },
      noDlStyle() {
        return {
          color: this.$themeTokens.annotation,
        };
      },
    },
    watch: {
      inDataExportPage(val) {
        return val ? this.startTaskPolling() : this.stopTaskPolling();
      },
    },
    mounted() {
      // fetch task list after fetching facilities, to ensure proper syncing state
      FacilityResource.fetchCollection({ force: true }).then(facilities => {
        this.$store.commit('manageCSV/RESET_STATE');
        this.$store.commit('manageCSV/SET_STATE', { facilities: facilities });
        this.inDataExportPage && this.refreshTaskList() && this.startTaskPolling();
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
        window.open(urls['kolibri:core:download_csv_file']('session'), '_blank');
      },
      downloadSummaryLog() {
        window.open(urls['kolibri:core:download_csv_file']('summary'), '_blank');
      },
    },
    $trs: {
      pageHeading: 'Export usage data',
      pageSubHeading:
        'Download CSV (comma-separated value) files containing information about users and their interactions with the resources on this device',
      detailsHeading: 'Session logs',
      detailsSubHeading: 'Individual visits to each resource',
      summaryHeading: 'Summary logs',
      summarySubHeading: 'Total time/progress for each resource',
      detailsInfo:
        'When a user views a resource, we record how long they spend and the progress they make. Each row in this file records a single visit a user made to a specific resource. This includes anonymous usage, when no user is signed in.',
      summaryInfo:
        'A user may visit the same resource multiple times. This file records the total time and progress each user has achieved for each resource, summarized across possibly more than one visit. Anonymous usage is not included.',
      generateLog: 'Generate log file',
      regenerateLog: 'Generate a new log file',
      noLogsYet: 'No logs are available to download.',
      download: 'Download',
      note: 'Note:',
      noDownload: 'Download is not supported on Android',
      documentTitle: 'Manage Data',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .infobox {
    padding: 8px;
    margin-right: -8px;
    margin-left: -8px;
    font-size: 0.8em;
    border-radius: $radius;
  }

  .download-button {
    margin-left: 0;
  }

</style>
