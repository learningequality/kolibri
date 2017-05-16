<template>

  <div class="pure-g">

    <h1 class="pure-u-1-1">{{$tr('pageHeading')}}</h1>

    <p class="pure-u-1-1">
      {{$tr('pageSubHeading')}}
    </p>

    <div :class="columnSize">
      <h2>{{$tr('detailsHeading')}}</h2>
      <p>
        {{$tr('detailsSubHeading')}}
      </p>
      <form :action="sessionlogurl" method="get">
        <icon-button :text="$tr('download')">
          <mat-svg category="file" name="file_download"/>
        </icon-button>
      </form>
      <p class="infobox">
        <b>{{$tr('note')}}</b>: {{$tr('detailsInfo')}}
      </p>
    </div>

    <div :class="columnSize">
      <h2>{{$tr('summaryHeading')}}</h2>
      <p>
        {{$tr('summarySubHeading')}}
      </p>
      <form :action="summarylogurl" method="get">
        <icon-button :text="$tr('download')">
          <mat-svg category="file" name="file_download"/>
        </icon-button>
      </form>
      <p class="infobox">
        <b>{{$tr('note')}}</b>: {{$tr('summaryInfo')}}
      </p>
    </div>

  </div>

</template>


<script>

  const coreApp = require('kolibri');
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    mixins: [responsiveWindow],
    $trNameSpace: 'manageData',
    $trs: {
      // Headings/subHeadings
      pageHeading: 'Export usage data',
      pageSubHeading: 'Download CSV (comma-separated value) files containing information about users and their interactions with the content on this device',
      detailsHeading: 'Detail logs',
      detailsSubHeading: 'Individual visits to each piece of content',
      summaryHeading: 'Summary logs',
      summarySubHeading: 'Total time/progress for each piece of content',
      // info boxes
      detailsInfo: 'When a user views content, we record how long they spend and the progress they make. Each row in this file records a single visit a user made to a specific piece of content. This includes anonymous usage, when no user is signed in.',
      summaryInfo: 'A user may visit the same piece of content multiple times. This file records the total time and progress each user has achieved for each piece of content, summarized across possibly more than one visit. Anonymous usage is not included.',
      // button
      download: 'Download',
      // section indicator
      note: 'Note',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    computed: {
      columnSize() {
        return this.windowSize.breakpoint > 2 ? 'pure-u-1-2' : 'pure-u-1-1';
      },
      summarylogurl() {
        return coreApp.urls['contentsummarylogcsv-list']();
      },
      sessionlogurl() {
        return coreApp.urls['contentsessionlogcsv-list']();
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
    margin-left: -8px
    margin-right: 8px

  form
    display: inline

</style>
