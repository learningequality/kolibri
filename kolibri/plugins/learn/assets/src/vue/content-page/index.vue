<template>

  <div>

    <page-header :title="content.title"/>

    <content-renderer
      v-show="!searchOpen"
      class="content-renderer"
      :id="content.id"
      :kind="content.kind"
      :files="content.files"
      :contentId="content.content_id"
      :channelId="channelId"
      :available="content.available"
      :extraFields="content.extra_fields"/>

    <icon-button @click="nextContentClicked" v-if="progress >= 1 && showNextBtn" class="next-btn">
      {{ $tr('nextContent') }}
      <svg class="right-arrow" src="../icons/arrow_right.svg"/>
    </icon-button>

    <p class="page-description">{{ content.description }}</p>

    <download-button v-if="canDownload" :files="content.files" class="download-button-left-align"/>

    <div class="metadata">
      <p>
        <strong>{{ $tr('author') }}: </strong>
        <span v-if="content.author">{{ content.author }}</span>
        <span v-else>-</span>
      </p>
      <p>
        <strong>{{ $tr('license') }}: </strong>
        <span v-if="content.license">{{ content.license }}</span>
        <span v-else>-</span>
      </p>
      <p>
        <strong>{{ $tr('copyrightHolder') }}: </strong>
        <span v-if="content.license_owner">{{ content.license_owner }}</span>
        <span v-else>-</span>
      </p>
    </div>

    <expandable-content-grid
      class="recommendation-section"
      v-if="pageMode === Constants.PageModes.LEARN"
      :title="recommendedText"
      :contents="recommended"/>

  </div>

</template>


<script>

  const Constants = require('../../state/constants');
  const getters = require('../../state/getters');
  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    $trNameSpace: 'learnContent',
    $trs: {
      recommended: 'Recommended',
      nextContent: 'Next Content',
      author: 'Author',
      license: 'License',
      copyrightHolder: 'Copyright Holder',
    },
    computed: {
      Constants() {
        return Constants; // allow constants to be accessed inside templates
      },
      canDownload() {
        if (this.content) {
          // computed property sometimes runs before the store is ready.
          return this.content.kind !== ContentNodeKinds.EXERCISE;
        }
        return false;
      },
      showNextBtn() {
        if (this.content) {
          return this.content.kind === ContentNodeKinds.EXERCISE;
        }
        return false;
      },
      recommendedText() {
        return this.$tr('recommended');
      },
      progress() {
        if (this.userkind.includes(UserKinds.LEARNER)) {
          return this.summaryProgress;
        }
        return this.sessionProgress;
      },
      nextContentLink() {
        if (this.content.next_content.kind !== ContentNodeKinds.TOPIC) {
          return {
            name: this.pagename,
            params: { channel_id: this.channelId, id: this.content.next_content.id },
          };
        }
        return {
          name: Constants.PageNames.EXPLORE_TOPIC,
          params: { channel_id: this.channelId, id: this.content.next_content.id },
        };
      },
    },
    components: {
      'page-header': require('../page-header'),
      'expandable-content-grid': require('../expandable-content-grid'),
    },
    methods: {
      nextContentClicked() {
        this.$router.push(this.nextContentLink);
      },
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
        content: (state) => state.pageState.content,
        channelId: (state) => state.core.channels.currentId,
        pagename: (state) => state.pageName,

        // only used on learn page
        recommended: (state) => state.pageState.recommended,

        summaryProgress: (state) => state.core.logging.summary.progress,
        sessionProgress: (state) => state.core.logging.session.progress,
        userkind: (state) => state.core.session.kind,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .recommendation-section
    margin-top: 4em

  .next-btn
    background-color: #4A8DDC
    border-color: #4A8DDC
    color: $core-bg-light
    padding-left: 16px
    padding-right: 6px
    padding-bottom: 0
    position: relative
    top: -60px
    left: 150px
    z-index: 10
    @media screen and (max-width: $medium-breakpoint)
      top: 0
      left: 0

  .next-btn:hover svg
    fill: $core-bg-light

  .right-arrow
    fill: $core-bg-light

  .right-arrow:hover
    fill: $core-bg-light

  .metadata
    display: inline-block

  .metadata p
    font-size: small

  .page-description
    margin-top: 1em
    margin-bottom: 1em
    line-height: 1.5em

  .download-button-left-align
    vertical-align: top
    margin-right: 1.5em

</style>

