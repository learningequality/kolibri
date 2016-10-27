<template>

  <div>

    <page-header :title="title"></page-header>

    <content-renderer
      v-show="!searchOpen"
      class="content-renderer"
      :id="id"
      :kind="kind"
      :files="files"
      :content-id="contentId"
      :channel-id="channelId"
      :available="available"
      :extra-fields="extraFields">
    </content-renderer>

    <p class="page-description">{{ description }}</p>

    <download-button v-if="canDownload" :files="files"></download-button>

    <expandable-content-grid
      class="recommendation-section"
      v-if="pageMode === $options.PageModes.LEARN"
      :title="recommendedText"
      :contents="recommended">
    </expandable-content-grid>

  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const getters = require('../../state/getters');
  const ContentKinds = require('kolibri.coreVue.vuex.constants').ContentKinds;

  module.exports = {
    $trNameSpace: 'learnContent',
    $trs: {
      recommended: 'Recommended',
    },
    computed: {
      canDownload() { return this.kind !== ContentKinds.EXERCISE; },
      recommendedText() {
        return this.$tr('recommended');
      },
    },
    mixins: [constants], // makes constants available in $options
    components: {
      'page-header': require('../page-header'),
      'expandable-content-grid': require('../expandable-content-grid'),
    },
    vuex: {
      getters: {
        // general state
        pageMode: getters.pageMode,

        // TODO - remove hack
        // temporarily using this to address an IE10 bug where the PDF
        // renderer displayed on top of the search pane.
        // see https://trello.com/c/LSevcA40/263-windows-7-ie-10-when-you-click-the-search-button-on-a-pdf-page-under-learn-tab-the-pdf-file-still-shows-when-it-shouldnt
        searchOpen: state => state.searchOpen,

        // attributes for this content item
        id: (state) => state.pageState.content.id,
        title: (state) => state.pageState.content.title,
        description: (state) => state.pageState.content.description,
        kind: (state) => state.pageState.content.kind,
        files: (state) => state.pageState.content.files,
        contentId: (state) => state.pageState.content.content_id,
        channelId: (state) => state.currentChannelId,
        available: (state) => state.pageState.content.available,
        extraFields: (state) => state.pageState.content.extra_fields,

        // only used on learn page
        recommended: (state) => state.pageState.recommended,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .recommendation-section
    margin-top: 4em

</style>

