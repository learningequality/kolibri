<template>

  <div class="wrapper">

    <h1>{{$tr('pageHeading')}}</h1>

    <p>
      {{$tr('pageSubHeading')}}
    </p>

    <div class="exportblock">
      <h2>{{$tr('detailsHeading')}}</h2>
      <p>
        {{$tr('detailsSubHeading')}}
      </p>
      <a :href="sessionlogurl">
        <icon-button :text="$tr('download')">
          <svg icon-name="material-file-file_download"/>
        </icon-button>
      </a>
      <p class="infobox">
        <b>{{$tr('note')}}</b>: {{$tr('detailsInfo')}}.
      </p>
    </div>

    <div class="exportblock">
      <h2>{{$tr('summaryHeading')}}</h2>
      <p>
        {{$tr('summarySubHeading')}}
      </p>
      <a :href="summarylogurl">
        <icon-button :text="$tr('download')">
          <svg icon-name="material-file-file_download"/>
        </icon-button>
      </a>
      <p class="infobox">
        <b>{{$tr('note')}}</b>: {{$tr('summaryInfo')}}
      </p>
    </div>

  </div>

</template>


<script>

  const coreApp = require('kolibri');

  module.exports = {
    $trNameSpace: 'manageData',
    $trs: {
      // Headings/subHeadings
      pageHeading: 'Export Usage Data',
      pageSubHeading: 'Download CSV (comma-separated value) files containing information about' +
        ' users and their interactions with the content on this device.',
      detailsHeading: 'Detail Logs',
      detailsSubHeading: 'Individual visits to each piece of content.',
      summaryHeading: 'Summary Logs',
      summarySubHeading: 'Total time/progress for each piece of content.',
      // info boxes
      detailsInfo: 'When a user views a piece of content, we record how long they spend and the' +
        ' progress they make. Each row in this file records a single visit a user made to a ' +
        'specific piece of content. This includes anonymous usage, when no user is logged in.',
      summaryInfo: 'A user may visit the same piece of content multiple times. This file records' +
        ' the total time and progress each user has achieved for each piece of content, ' +
        'summarized across possibly more than one visit. Anonymous usage is not included.',
      // button
      download: 'Download',
      // section indicator
      note: 'Note',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    computed: {
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

  @require 'jeet'
  @require '~kolibri.styles.coreTheme'

  @media (min-width: $medium-breakpoint)
    .exportblock
      col(1/2)

  .infobox
    background-color: $core-bg-warning
    border-radius: $radius
    font-size: 0.8em
    padding: 8px
    margin-left: -8px
    margin-right: 8px

  .wrapper
    cf()

</style>
