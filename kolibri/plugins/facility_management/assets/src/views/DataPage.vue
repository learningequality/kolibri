<template>

  <KGrid>

    <KGridItem size="100" percentage>
      <h1>{{ $tr('pageHeading') }}</h1>
    </KGridItem>

    <KGridItem size="100" percentage>
      <p>{{ $tr('pageSubHeading') }}</p>
    </KGridItem>

    <KGridItem sizes="100, 50, 50" percentage>
      <h2>{{ $tr('detailsHeading') }}</h2>
      <p>
        {{ $tr('detailsSubHeading') }}
      </p>
      <div>
        <KButton
          :text="$tr('download')"
          :disabled="!availableSessionCSVLog"
          @click="downloadSessionLog"
        />
        <TaskProgress
          v-if="inSessionCSVCreation"
          id="generatingsessionlogcsv"
          type="EXPORTSESSIONLOGCSV"
        />
        <span v-else>
          <span v-if="noSessionLogs"> {{ $tr('noLogsYet') }}</span>
          <span v-else>
            {{ $tr('generated') }}
            <ElapsedTime
              :date="sessionDateCreated"
            />.
          </span>
          <KButton
            appearance="basic-link"
            :text="noSessionLogs ? $tr('generateLog') : $tr('regenerateLog')"
            :disabled="cannotDownload"
            @click="generateSessionLog"
          />
          <span v-if="cannotDownload" class="no-dl">{{ $tr('noDownload') }}</span>
        </span>
      </div>
      <p class="infobox">
        <b>{{ $tr('note') }}</b>: {{ $tr('detailsInfo') }}
      </p>
    </KGridItem>

    <KGridItem sizes="100, 50, 50" percentage>
      <h2>{{ $tr('summaryHeading') }}</h2>
      <p>
        {{ $tr('summarySubHeading') }}
      </p>
      <div>
        <KButton
          :text="$tr('download')"
          :disabled="!availableSummaryCSVLog"
          @click="downloadSummaryLog"
        />
        <TaskProgress
          v-if="inSummaryCSVCreation"
          id="generatingummarylogcsv"
          type="EXPORTSUMMARYLOGCSV"
        />
        <span v-else>
          <span v-if="noSummaryLogs"> {{ $tr('noLogsYet') }}</span>
          <span v-else>
            {{ $tr('generated') }}
            <ElapsedTime
              :date="summaryDateCreated"
            />.
          </span>
          <KButton
            appearance="basic-link"
            :text="noSummaryLogs ? $tr('generateLog') : $tr('regenerateLog')"
            :disabled="cannotDownload"
            @click="generateSummaryLog"
          />
          <span v-if="cannotDownload" class="no-dl">{{ $tr('noDownload') }}</span>
        </span>
      </div>
      <p class="infobox">
        <b>{{ $tr('note') }}</b>: {{ $tr('summaryInfo') }}
      </p>
    </KGridItem>


  </KGrid>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { isAndroidWebView } from 'kolibri.utils.browser';
  import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KButton from 'kolibri.coreVue.components.KButton';
  import urls from 'kolibri.urls';
  import { PageNames } from '../constants';
  import TaskProgress from './TaskProgress';

  export default {
    name: 'DataPage',
    components: {
      ElapsedTime,
      KButton,
      KGrid,
      KGridItem,
      TaskProgress,
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
      generated: 'Generated ',
      generateLog: 'Generate log file',
      regenerateLog: 'Regenerate log file',
      noLogsYet: 'No logs are available to download yet.',
      download: 'Download',
      note: 'Note',
      noDownload: 'Download is not supported on Android',
      documentTitle: 'Manage Data',
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
        return isAndroidWebView();
      },
      generatingCSVFile() {
        return this.inSummaryCSVCreation || this.inSessionCSVCreation;
      },
      inDataExportPage() {
        return this.pageName === PageNames.DATA_EXPORT_PAGE;
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
    font-size: 0.8em;
    background-color: $core-bg-warning;
    border-radius: $radius;
  }

  .no-dl {
    display: inline-block;
    font-size: 0.8em;
    color: $core-text-annotation;
  }

</style>
