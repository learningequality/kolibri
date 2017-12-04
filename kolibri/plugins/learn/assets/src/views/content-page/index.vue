<template>

  <div>

    <!-- TODO: RTL - Remove ta-l -->
    <page-header :title="content.title" dir="auto" class="ta-l" />

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
      <k-button :primary="true" @click="nextContentClicked" v-if="showNextBtn" class="float" :text="$tr('nextContent')" alignment="right" />
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
      :checkButtonIsPrimary="!showNextBtn"
      :initSession="initSession">
      <k-button :primary="true" @click="nextContentClicked" v-if="showNextBtn" class="float" :text="$tr('nextContent')" alignment="right" />
    </assessment-wrapper>

    <!-- TODO: RTL - Remove ta-l -->
    <p v-html="description" dir="auto" class="ta-l"></p>


    <div class="metadata">
      <!-- TODO: RTL - Do not interpolate strings -->
      <p v-if="content.author">
        {{ $tr('author', {author: content.author}) }}
      </p>

      <!-- TODO: RTL - Do not interpolate strings -->
      <p v-if="content.license">
        {{ $tr('license', {license: content.license}) }}

        <template v-if="content.license_description">
          <ui-icon-button
            :icon="licenceDescriptionIsVisible ? 'expand_less' : 'expand_more'"
            :ariaLabel="$tr('toggleLicenseDescription')"
            size="small"
            type="secondary"
            @click="licenceDescriptionIsVisible = !licenceDescriptionIsVisible"
          />
          <!-- TODO: RTL - Do not interpolate strings -->
          <p v-if="licenceDescriptionIsVisible" dir="auto" class="ta-l">
            {{ content.license_description }}
          </p>
        </template>

      </p>

      <p v-if="content.license_owner">
        {{ $tr('copyrightHolder', {copyrightHolder: content.license_owner}) }}
      </p>
    </div>

    <download-button v-if="canDownload" :files="downloadableFiles" class="download-button" />

    <template v-if="showRecommended">
      <h2>{{ $tr('recommended') }}</h2>
      <content-card-group-carousel
        :genContentLink="genContentLink"
        :header="recommendedText"
        :contents="recommended" />
    </template>

    <template v-if="progress >= 1 && wasIncomplete">
      <points-popup
        v-if="showPopup"
        @close="markAsComplete"
        :kind="content.next_content.kind"
        :title="content.next_content.title">
        <k-button :primary="true" slot="nextItemBtn" @click="nextContentClicked" :text="$tr('nextContent')" alignment="right" />
      </points-popup>

      <transition v-else name="slidein" appear>
        <points-slidein @close="markAsComplete" />
      </transition>
    </template>

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
  import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
  import { updateContentNodeProgress } from '../../state/actions/main';
  import pageHeader from '../page-header';
  import contentCardGroupCarousel from '../content-card-group-carousel';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import downloadButton from 'kolibri.coreVue.components.downloadButton';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { isAndroidWebView } from 'kolibri.utils.browser';
  import assessmentWrapper from '../assessment-wrapper';
  import pointsPopup from '../points-popup';
  import pointsSlidein from '../points-slidein';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import markdownIt from 'markdown-it';

  export default {
    name: 'learnContent',
    $trs: {
      recommended: 'Recommended',
      nextContent: 'Go to next item',
      author: 'Author: {author}',
      license: 'License: {license}',
      toggleLicenseDescription: 'Toggle license description',
      copyrightHolder: 'Copyright holder: {copyrightHolder}',
    },
    components: {
      pageHeader,
      contentCardGroupCarousel,
      contentRenderer,
      downloadButton,
      kButton,
      assessmentWrapper,
      pointsPopup,
      pointsSlidein,
      uiIconButton,
    },
    data: () => ({
      wasIncomplete: false,
      licenceDescriptionIsVisible: false,
    }),
    computed: {
      canDownload() {
        if (this.content) {
          return (
            this.downloadableFiles.length &&
            this.content.kind !== ContentNodeKinds.EXERCISE &&
            !isAndroidWebView()
          );
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
        if (this.isUserLoggedIn) {
          return this.summaryProgress;
        }
        return this.sessionProgress;
      },
      nextContentLink() {
        if (this.content.next_content) {
          return this.genContentLink(this.content.next_content.id, this.content.next_content.kind);
        }
        return null;
      },
      showRecommended() {
        if (this.recommended && this.pageMode === PageModes.RECOMMENDED) {
          return true;
        }
        return false;
      },
      showPopup() {
        return (
          this.content.kind === ContentNodeKinds.EXERCISE ||
          this.content.kind === ContentNodeKinds.VIDEO ||
          this.content.kind === ContentNodeKinds.AUDIO
        );
      },
      downloadableFiles() {
        return this.content.files.filter(file => file.preset !== 'Thumbnail');
      },
    },
    beforeDestroy() {
      this.stopTracking();
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
      markAsComplete() {
        this.wasIncomplete = false;
      },
      genContentLink(id, kind) {
        if (kind === 'topic') {
          return {
            name: PageNames.TOPICS_TOPIC,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.RECOMMENDED_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        searchOpen: state => state.searchOpen,
        content: state => state.pageState.content,
        contentId: state => state.pageState.content.content_id,
        contentNodeId: state => state.pageState.content.id,
        channelId: state => state.pageState.content.channel_id,
        pagename: state => state.pageName,
        recommended: state => state.pageState.recommended,
        summaryProgress: state => state.core.logging.summary.progress,
        sessionProgress: state => state.core.logging.session.progress,
        pageMode,
        isUserLoggedIn,
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

  .ta-l
    text-align: left

</style>
