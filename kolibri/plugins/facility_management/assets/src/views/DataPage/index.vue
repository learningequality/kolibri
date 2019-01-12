<template>

  <KGrid :gutter="48">

    <KGridItem size="100" percentage>
      <h1>{{ $tr('pageHeading') }}</h1>
    </KGridItem>

    <KGridItem size="100" percentage>
      <p>{{ $tr('pageSubHeading') }}</p>
    </KGridItem>

    <KGridItem sizes="100, 50, 50" percentage>
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
      <p v-if="cannotDownload" :style="noDlStyle">{{ $tr('noDownload') }}</p>
      <p v-else-if="inSessionCSVCreation"><DataPageTaskProgress /></p>
      <p v-else>
        <span v-if="noSessionLogs"> {{ $tr('noLogsYet') }} </span>
        <GeneratedElapsedTime v-else :date="sessionDateCreated" />
        <KButton
          appearance="basic-link"
          :text="noSessionLogs ? $tr('generateLog') : $tr('regenerateLog')"
          @click="generateSessionLog"
        />
      </p>
      <p class="infobox" :style="infoBoxStyle">
        <b>{{ $tr('note') }}</b> {{ $tr('detailsInfo') }}
      </p>
    </KGridItem>

    <KGridItem sizes="100, 50, 50" percentage>
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
      <p v-if="cannotDownload" :style="noDlStyle">{{ $tr('noDownload') }}</p>
      <p v-else-if="inSummaryCSVCreation"><DataPageTaskProgress /></p>
      <p v-else>
        <span v-if="noSummaryLogs"> {{ $tr('noLogsYet') }} </span>
        <GeneratedElapsedTime v-else :date="summaryDateCreated" />
        <KButton
          appearance="basic-link"
          :text="noSummaryLogs ? $tr('generateLog') : $tr('regenerateLog')"
          @click="generateSummaryLog"
        />
      </p>
      <p class="infobox" :style="infoBoxStyle">
        <b>{{ $tr('note') }}</b> {{ $tr('summaryInfo') }}
      </p>
    </KGridItem>

  </KGrid>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { isAndroidWebView } from 'kolibri.utils.browser';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KButton from 'kolibri.coreVue.components.KButton';
  import urls from 'kolibri.urls';
  import { PageNames } from '../../constants';
  import GeneratedElapsedTime from './GeneratedElapsedTime';
  import DataPageTaskProgress from './DataPageTaskProgress';

  export default {
    name: 'DataPage',
    components: {
      GeneratedElapsedTime,
      KButton,
      KGrid,
      KGridItem,
      DataPageTaskProgress,
    },
    data() {
      return {
        lista: urls,
      };
    },
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    $trs: {
      pageHeading: 'Export usage data',
      pageSubHeading:
        'Download CSV (comma-separated value) files containing information about users and their interactions with the content on this device',
      detailsHeading: 'Session logs',
      detailsSubHeading: 'Individual visits to each piece of content',
      summaryHeading: 'Summary logs',
      summarySubHeading: 'Total time/progress for each piece of content',
      detailsInfo:
        'When a user views content, we record how long they spend and the progress they make. Each row in this file records a single visit a user made to a specific piece of content. This includes anonymous usage, when no user is signed in.',
      summaryInfo:
        'A user may visit the same piece of content multiple times. This file records the total time and progress each user has achieved for each piece of content, summarized across possibly more than one visit. Anonymous usage is not included.',
      generateLog: 'Generate log file',
      regenerateLog: 'Generate a new log file',
      noLogsYet: 'No logs are available to download.',
      download: 'Download',
      note: 'Note:',
      noDownload: 'Download is not supported on Android',
      documentTitle: 'Manage Data',
    },
    computed: {
      ...mapGetters(['$coreBgWarning', '$coreTextAnnotation']),
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
        return isAndroidWebView();
      },
      generatingCSVFile() {
        return this.inSummaryCSVCreation || this.inSessionCSVCreation;
      },
      inDataExportPage() {
        return this.pageName === PageNames.DATA_EXPORT_PAGE;
      },
      infoBoxStyle() {
        return {
          backgroundColor: this.$coreBgWarning,
        };
      },
      noDlStyle() {
        return {
          color: this.$coreTextAnnotation,
        };
      },
    },
    watch: {
      inDataExportPage(val) {
        return val ? this.startTaskPolling() : this.stopTaskPolling();
      },
    },
    mounted() {
      this.inDataExportPage && this.refreshTaskList() && this.startTaskPolling();
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
