<template>

  <div>

    <page-header :title='title'>
      <content-icon
        slot='icon'
        :ispageicon="true"
        :size="25"
        :kind="kind"
        :progress="progress">
      </content-icon>
    </page-header>

    <div class="content-container" v-show='!searchOpen'>
      <content-render
        :id="id"
        :kind="kind"
        :files="files"
        :content-id="contentId"
        :available="available"
        :extra-fields="extraFields">
      </content-render>
    </div>

    <page-header :title='title'>
      <content-icon
        slot='icon'
        :ispageicon="true"
        :size="25"
        :kind="kind"
        :progress="progress">
      </content-icon>
    </page-header>

    <download-button
      :kind="kind"
      :files="files"
      :available="available"
      :title="title">
    </download-button>

    <p class="page-description">
      {{ description }}
    </p>

    <expandable-content-grid class="recommendation-section"
      v-if="pageMode === $options.PageModes.LEARN"
      title="Recommended"
      :contents="recommended">
    </expandable-content-grid>

  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const getters = require('../../state/getters');

  module.exports = {
    mixins: [constants], // makes constants available in $options
    components: {
      'content-icon': require('../content-icon'),
      'page-header': require('../page-header'),
      'content-render': require('content-renderer'),
      'download-button': require('content-renderer/download-button'),
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
        available: (state) => state.pageState.content.available,
        extraFields: (state) => state.pageState.content.extra_fields,

        // only used on learn page
        recommended: (state) => state.pageState.recommended,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .content-container
    height: 60vh
    margin-bottom: 1em

  #little-arrow
    font-size: 28px
    font-weight: 900

  .recommendation-section
    margin-top: 4em

</style>

