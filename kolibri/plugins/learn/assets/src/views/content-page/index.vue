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
      <k-button :primary="true" @click="nextContentClicked" v-if="showNextBtn" class="float" :text="$tr('nextContent')" alignment="right"/>
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
      <k-button :primary="true" @click="nextContentClicked" v-if="showNextBtn" class="float" :text="$tr('nextContent')" alignment="right"/>
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
      :gen-link="genRecLink"
      :header="recommendedText"
      :contents="recommended"/>

    <content-points
      v-if="progress >= 1 && wasIncomplete"
      @close="closeModal"
      :kind="content.next_content.kind"
      :title="content.next_content.title">

      <k-button :primary="true" slot="nextItemBtn" @click="nextContentClicked" :text="$tr('nextContent')" alignment="right"/>
    </content-points>

  </div>

</template>


<script>

  import {
    initContentSession as initSessionAction,
    updateProgress as updateProgressAction,
    startTrackingProgress as startTracking,
    stopTrackingProgress as stopTracking,
  } from 'kolibri.coreVue.vuex.actions';
  import { PageNames, PageModes } from '../../constants';
  import { pageMode } from '../../state/getters';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import { updateContentNodeProgress } from '../../state/actions';
  import pageHeader from '../page-header';
  import contentCardCarousel from '../content-card-carousel';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import downloadButton from 'kolibri.coreVue.components.downloadButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import assessmentWrapper from '../assessment-wrapper';
  import contentPoints from '../content-points';
  import uiPopover from 'keen-ui/src/UiPopover';
  import uiIcon from 'keen-ui/src/UiIcon';
  import markdownIt from 'markdown-it';

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
        return this.progress >= 1 && this.content && this.nextContentLink;
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
        const nextContent = this.content.next_content;
        if (nextContent) {
          if (nextContent.kind === 'topic') {
            return {
              name: PageNames.EXPLORE_TOPIC,
              params: { channel_id: this.channelId, id: nextContent.id },
            };
          }
          return {
            name: PageNames.EXPLORE_CONTENT,
            params: { channel_id: this.channelId, id: nextContent.id },
          };
        }
        return null;
      },
      showRecommended() {
        if (this.recommended && this.pageMode === PageModes.LEARN) {
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
      kButton,
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
      genRecLink(id, kind) {
        if (kind === 'topic') {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.LEARN_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    beforeDestroy() {
      this.stopTracking();
    },
    vuex: {
      getters: {
        searchOpen: state => state.searchOpen,
        content: state => state.pageState.content,
        contentId: state => state.pageState.content.content_id,
        contentNodeId: state => state.pageState.content.id,
        channelId: state => state.core.channels.currentId,
        pagename: state => state.pageName,
        recommended: state => state.pageState.recommended,
        summaryProgress: state => state.core.logging.summary.progress,
        sessionProgress: state => state.core.logging.session.progress,
        pageMode,
        isSuperuser,
      },
      actions: {
        initSessionAction,
        updateProgressAction,
        startTracking,
        stopTracking,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .float
    float: right

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
