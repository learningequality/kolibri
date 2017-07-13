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
      <icon-button @click="nextContentClicked" v-if="progress >= 1 && showNextBtn" class="next-btn float" :text="$tr('nextContent')" alignment="right">
        <mat-svg v-if="isRtl" class="arrow" category="navigation" name="chevron_right"/>
        <mat-svg v-else class="arrow" category="navigation" name="chevron_left"/>
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
      <icon-button @click="nextContentClicked" v-if="progress >= 1 && showNextBtn" class="next-btn float" :text="$tr('nextContent')" alignment="right">
        <mat-svg v-if="isRtl" class="arrow" category="navigation" name="chevron_right"/>
        <mat-svg v-else class="arrow" category="navigation" name="chevron_left"/>
      </icon-button>
    </assessment-wrapper>

    <p v-html="description"></p>


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

    <content-card-carousel
      v-if="showRecommended"
      :gen-link="genLink"
      :header="recommendedText"
      :contents="recommended"/>

    <content-points
      v-if="progress >= 1 && wasIncomplete"
      @close="closeModal"
      :kind="content.next_content.kind"
      :title="content.next_content.title">

      <icon-button slot="nextItemBtn" @click="nextContentClicked" class="next-btn" :text="$tr('nextContent')" alignment="right">
        <mat-svg v-if="isRtl" class="arrow" category="navigation" name="chevron_right"/>
        <mat-svg v-else class="arrow" category="navigation" name="chevron_left"/>
      </icon-button>
    </content-points>

  </div>

</template>


<script>

  import * as Constants from '../../constants';
  import * as getters from '../../state/getters';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import * as coreGetters from 'kolibri.coreVue.vuex.getters';
  import * as actions from 'kolibri.coreVue.vuex.actions';
  import { updateContentNodeProgress } from '../../state/actions';
  import pageHeader from '../page-header';
  import contentCardCarousel from '../content-card-carousel';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import downloadButton from 'kolibri.coreVue.components.downloadButton';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import assessmentWrapper from '../assessment-wrapper';
  import contentPoints from '../content-points';
  import uiPopover from 'keen-ui/src/UiPopover';
  import uiIcon from 'keen-ui/src/UiIcon';
  import markdownIt from 'markdown-it';
  import Vue from 'kolibri.lib.vue';

  export default {
    name: 'learnContent',
    $trs: {
      recommended: 'Recommended',
      nextContent: 'Go to next item',
      author: 'Author',
      license: 'License',
      licenseDescription: 'License description',
      copyrightHolder: 'Copyright holder',
    },
    data: () => ({ wasIncomplete: false }),
    computed: {
      canDownload() {
        if (this.content) {
          return this.content.kind !== ContentNodeKinds.EXERCISE;
        }
        return false;
      },
      description() {
        if (this.content) {
          const md = new markdownIt('zero', { breaks: true });
          return md.render(this.content.description);
        }
      },
      showNextBtn() {
        return this.content && this.nextContentLink;
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
          return this.genLink(this.content.next_content.id, this.content.next_content.kind);
        }
        return null;
      },
      showRecommended() {
        if (this.recommended && this.pageMode === Constants.PageModes.LEARN) {
          return true;
        }
        return false;
      },
    },
    components: {
      pageHeader,
      contentCardCarousel,
      contentRenderer,
      downloadButton,
      iconButton,
      assessmentWrapper,
      contentPoints,
      uiPopover,
      uiIcon,
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
      genLink(id, kind) {
        if (kind === 'topic') {
          return {
            name: Constants.PageNames.EXPLORE_TOPIC,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: Constants.PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    beforeDestroy() {
      this.stopTracking();
    },
    vuex: {
      getters: {
        pageMode: getters.pageMode,
        searchOpen: state => state.searchOpen,
        content: state => state.pageState.content,
        contentId: state => state.pageState.content.content_id,
        contentNodeId: state => state.pageState.content.id,
        channelId: state => state.core.channels.currentId,
        pagename: state => state.pageName,
        recommended: state => state.pageState.recommended,
        summaryProgress: state => state.core.logging.summary.progress,
        sessionProgress: state => state.core.logging.session.progress,
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

  .next-btn
    background-color: #4A8DDC
    border: none
    color: $core-bg-light
    &:hover
      &:not(.is-disabled)
        background-color: #336db1

  .next-btn:hover svg
    fill: $core-bg-light

  .float
    float: right

  .arrow
    fill: $core-bg-light

  .arrow:hover
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
