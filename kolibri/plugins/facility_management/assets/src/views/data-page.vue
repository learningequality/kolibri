<template>

  <k-grid>

    <k-grid-item size="1" cols="1">
      <h1>{{ $tr('pageHeading') }}</h1>
    </k-grid-item>
    <k-grid-item size="1" cols="1">
      <p>{{ $tr('pageSubHeading') }}</p>
    </k-grid-item>

    <k-grid-item size="1" :cols="numCols">
      <h2>{{ $tr('detailsHeading') }}</h2>
      <p>
        {{ $tr('detailsSubHeading') }}
      </p>
      <div>
        <k-button :text="$tr('download')" :disabled="cannotDownload" @click="downloadSessionLog" />
        <span class="no-dl" v-if="cannotDownload">{{ $tr('noDownload') }}</span>
      </div>
      <p class="infobox">
        <b>{{ $tr('note') }}</b>: {{ $tr('detailsInfo') }}
      </p>
    </k-grid-item>

    <k-grid-item size="1" :cols="numCols">
      <h2>{{ $tr('summaryHeading') }}</h2>
      <p>
        {{ $tr('summarySubHeading') }}
      </p>
      <div>
        <k-button :text="$tr('download')" :disabled="cannotDownload" @click="downloadSummaryLog" />
        <span class="no-dl" v-if="cannotDownload">{{ $tr('noDownload') }}</span>
      </div>
      <p class="infobox">
        <b>{{ $tr('note') }}</b>: {{ $tr('summaryInfo') }}
      </p>
    </k-grid-item>

  </k-grid>

</template>


<script>

  import urls from 'kolibri.urls';
  import { isAndroidWebView } from 'kolibri.utils.browser';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'dataPage',
    components: {
      kButton,
      kGrid,
      kGridItem,
    },
    mixins: [responsiveWindow],
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
      download: 'Download',
      note: 'Note',
      noDownload: 'Download is not supported on Android',
    },
    computed: {
      cannotDownload() {
        return isAndroidWebView();
      },
      numCols() {
        return this.windowSize.breakpoint > 2 ? 2 : 1;
      },
    },
    methods: {
      downloadSessionLog() {
        window.location = urls['contentsessionlogcsv-list']();
      },
      downloadSummaryLog() {
        window.location = urls['contentsummarylogcsv-list']();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .infobox
    background-color: $core-bg-warning
    border-radius: $radius
    font-size: 0.8em
    padding: 8px

  .no-dl
    font-size: 0.8em
    color: $core-text-annotation
    display: inline-block

</style>
