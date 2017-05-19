<template>

  <div>

    <page-header :title="content.title">
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
      <icon-button @click="nextContentClicked" v-if="progress >= 1 && showNextBtn" class="next-btn right" :text="$tr('nextContent')" alignment="right">
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
      <icon-button @click="nextContentClicked" v-if="progress >= 1 && showNextBtn" class="next-btn right" :text="$tr('nextContent')" alignment="right">
        <mat-svg class="right-arrow" category="navigation" name="chevron_right"/>
      </icon-button>
    </assessment-wrapper>

    <p>{{ content.description }}</p>


    <div class="metadata">
      <p v-if="content.author">
        {{ $tr('author') }}: {{ content.author }}
      </p>

      <p v-if="content.license" >
        {{ $tr('license') }}: {{ content.license }}

        <template v-if="content.license_description">
          <span ref="licensetooltip">
            <ui-icon icon="info_outline" :ariaLabel="$tr('licenseDescription')" class="license-tooltip"/>
          </span>

          <ui-popover trigger="licensetooltip" class="license-description">
            {{ content.license_description }}
          </ui-popover>
        </template>

      </p>

      <p v-if="content.license_owner">
        {{ $tr('copyrightHolder') }}: {{ content.license_owner }}
      </p>
    </div>

    <download-button v-if="canDownload" :files="content.files" class="download-button"/>

    <expandable-content-grid
      class="recommendation-section"
      v-if="pageMode === Constants.PageModes.LEARN"
      :title="recommendedText"
      :contents="recommended"/>

    <content-points
      v-if="progress >= 1 && wasIncomplete"
      @close="closeModal"
      :kind="content.next_content.kind"
      :title="content.next_content.title">

      <icon-button slot="nextItemBtn" @click="nextContentClicked" class="next-btn" :text="$tr('nextContent')" alignment="right">
        <mat-svg class="right-arrow" category="navigation" name="chevron_right"/>
      </icon-button>
    </content-points>

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
      licenseDescription: 'License description',
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
        return (this.content && this.nextContentLink);
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
        if (this.content.next_content) {
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
        }
        return null;
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
      'ui-popover': require('keen-ui/src/UiPopover'),
      'ui-icon': require('keen-ui/src/UiIcon'),
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
      closeModal() {
        this.wasIncomplete = false;
      },
    },
    beforeDestroy() {
      this.stopTracking();
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
    border: none
    color: $core-bg-light
    &:hover
      &:not(.is-disabled)
        background-color: #336db1

  .next-btn:hover svg
    fill: $core-bg-light

  .right
    float: right

  .right-arrow
    fill: $core-bg-light

  .right-arrow:hover
    fill: $core-bg-light

  .metadata
    font-size: smaller

  .download-button
    display: block

  .license-tooltip
    cursor: pointer
    font-size: 1.25em
    color: $core-action-dark

  .license-description
    max-width: 300px
    padding: 1em
    font-size: smaller

</style>

