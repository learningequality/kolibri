<template>

  <KGrid>

    <KGridItem size="1" cols="1">
      <h1>{{ $tr('pageHeading') }}</h1>
    </KGridItem>
    <KGridItem size="1" cols="1">
      <p>{{ $tr('pageSubHeading') }}</p>
    </KGridItem>

    <KGridItem size="1" :cols="numCols">
      <h2>{{ $tr('detailsHeading') }}</h2>
      <p>
        {{ $tr('detailsSubHeading') }}
      </p>
      <div>
        <KButton :text="$tr('download')" :disabled="cannotDownload" @click="downloadSessionLog" />
        <span class="no-dl" v-if="cannotDownload">{{ $tr('noDownload') }}</span>
      </div>
      <p class="infobox">
        <b>{{ $tr('note') }}</b>: {{ $tr('detailsInfo') }}
      </p>
    </KGridItem>

    <KGridItem size="1" :cols="numCols">
      <h2>{{ $tr('summaryHeading') }}</h2>
      <p>
        {{ $tr('summarySubHeading') }}
      </p>
      <div>
        <KButton :text="$tr('download')" :disabled="cannotDownload" @click="downloadSummaryLog" />
        <span class="no-dl" v-if="cannotDownload">{{ $tr('noDownload') }}</span>
      </div>
      <p class="infobox">
        <b>{{ $tr('note') }}</b>: {{ $tr('summaryInfo') }}
      </p>
    </KGridItem>

  </KGrid>

</template>


<script>

  import urls from 'kolibri.urls';
  import { isAndroidWebView } from 'kolibri.utils.browser';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KButton from 'kolibri.coreVue.components.KButton';

  export default {
    name: 'DataPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      KButton,
      KGrid,
      KGridItem,
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
      documentTitle: 'Manage Data',
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
