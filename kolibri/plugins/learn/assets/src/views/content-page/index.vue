<template>

  <div>

    <page-header :title="content.title">
      <content-points
        slot="end-header"
        :showPopover="progress >= 1 && wasIncomplete"/>
    </page-header>

    <content-renderer
      v-if="!content.assessment"
      v-show="!searchOpen"
      class="content-renderer"
      @sessionInitialized="setWasIncomplete"
      @startTracking="startTracking"
      @stopTracking="stopTracking"
      @updateProgress="updateProgress"
      :id="content.id"
      :kind="content.kind"
      :files="content.files"
      :contentId="content.content_id"
      :channelId="channelId"
      :available="content.available"
      :extraFields="content.extra_fields"
      :initSession="initSession">
      <icon-button @click="nextContentClicked" v-if="progress >= 1 && showNextBtn" class="next-btn" :text="$tr('nextContent')" alignment="right">
        <mat-svg class="right-arrow" category="navigation" name="chevron_right"/>
      </icon-button>
    </content-renderer>

    <assessment-wrapper
      v-else
      v-show="!searchOpen"
      class="content-renderer"
      @sessionInitialized="setWasIncomplete"
      @startTracking="startTracking"
      @stopTracking="stopTracking"
      @updateProgress="updateProgress"
      :id="content.id"
      :kind="content.kind"
      :files="content.files"
      :contentId="content.content_id"
      :channelId="channelId"
      :available="content.available"
      :extraFields="content.extra_fields"
      :initSession="initSession">
      <icon-button @click="nextContentClicked" v-if="progress >= 1 && showNextBtn" class="next-btn" :text="$tr('nextContent')" alignment="right">
        <mat-svg class="right-arrow" category="navigation" name="chevron_right"/>
      </icon-button>
    </assessment-wrapper>

    <p class="page-description">{{ content.description }}</p>

    <download-button v-if="canDownload" :files="content.files" class="download-button-left-align"/>

    <div class="metadata">
      <p v-if="content.author">
        <strong>{{ $tr('author') }}: </strong>{{ content.author }}
      </p>
      <p v-if="content.license">
        <strong>{{ $tr('license') }}: </strong>{{ content.license }}
      </p>
      <p v-if="content.license_description">
        <strong>{{ $tr('license') }}: </strong>{{ content.license_description }}
      </p>
      <p v-if="content.license_owner">
        <strong>{{ $tr('copyrightHolder') }}: </strong>{{ content.license_owner }}
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

  const Constants = require('../../constants');
  const getters = require('../../state/getters');
  const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
  const coreGetters = require('kolibri.coreVue.vuex.getters');
  const actions = require('kolibri.coreVue.vuex.actions');
  const { updateContentNodeProgress } = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'learnContent',
    $trs: {
      recommended: 'Recommended',
      nextContent: 'Next item',
      author: 'Author',
      license: 'License',
      copyrightHolder: 'Copyright holder',
    },
    data: () => ({
      wasIncomplete: false,
    }),
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
        if (!this.isSuperuser) {
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
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'download-button': require('kolibri.coreVue.components.downloadButton'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'assessment-wrapper': require('../assessment-wrapper'),
      'content-points': require('../content-points'),
    },
    methods: {
      nextContentClicked() {
        this.$router.push(this.nextContentLink);
      },
      setWasIncomplete() {
        this.wasIncomplete = this.progress < 1;
      },
      initSession() {
        return this.initSessionAction(this.channelId, this.contentId, this.content.kind);
      },
      updateProgress(progressPercent, forceSave = false) {
        const summaryProgress = this.updateProgressAction(progressPercent, forceSave);
        updateContentNodeProgress(this.channelId, this.contentNodeId, summaryProgress);
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
        contentId: (state) => state.pageState.content.content_id,
        contentNodeId: (state) => state.pageState.content.id,
        channelId: (state) => state.core.channels.currentId,
        pagename: (state) => state.pageName,

        // only used on learn page
        recommended: (state) => state.pageState.recommended,

        summaryProgress: (state) => state.core.logging.summary.progress,
        sessionProgress: (state) => state.core.logging.session.progress,

        isSuperuser: coreGetters.isSuperuser,
      },
      actions: {
        initSessionAction: actions.initContentSession,
        updateProgressAction: actions.updateProgress,
        startTracking: actions.startTrackingProgress,
        stopTracking: actions.stopTrackingProgress,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .recommendation-section
    margin-top: 4em

  .next-btn
    background-color: #4A8DDC
    border-color: #4A8DDC
    color: $core-bg-light
    float: right
    margin-right: 1.5em
    &:hover
      &:not(.is-disabled)
        background-color: #336db1

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

