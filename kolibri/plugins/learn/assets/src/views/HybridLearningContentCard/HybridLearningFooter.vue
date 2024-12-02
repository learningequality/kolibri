<template>

  <div class="footer">
    <ProgressBar
      class="progress-bar"
      :contentNode="contentNode"
      :style="{ maxWidth: `calc(100% - ${24 + 32 * footerLength}px)` }"
    />
    <div class="footer-icons">
      <KIconButton
        v-if="downloadableByLearner"
        icon="download"
        size="mini"
        :color="$themePalette.grey.v_700"
        :ariaLabel="coreString('downloadAction')"
        :tooltip="coreString('downloadAction')"
        @click="handleDownloadRequest"
      />
      <KIconButton
        v-if="bookmarked"
        icon="close"
        size="mini"
        :color="$themePalette.grey.v_700"
        :ariaLabel="coreString('removeFromBookmarks')"
        :tooltip="coreString('removeFromBookmarks')"
        @click="$emit('removeFromBookmarks')"
      />
      <CoachContentLabel
        v-if="isUserLoggedIn && !isLearner && contentNode.num_coach_contents"
        :style="coachContentLabelStyles"
        class="coach-content-label"
        :value="contentNode.num_coach_contents"
        :isTopic="isTopic"
      />
      <KIconButton
        v-if="contentNode.is_leaf"
        icon="infoOutline"
        size="mini"
        :color="$themePalette.grey.v_700"
        :ariaLabel="coreString('viewInformation')"
        :tooltip="coreString('viewInformation')"
        @click="$emit('toggleInfoPanel')"
      />
      <KIconButton
        v-if="downloadedByLearner"
        ref="moreOptionsButton"
        data-test="moreOptionsButton"
        icon="optionsHorizontal"
        :tooltip="coreString('moreOptions')"
        :ariaLabel="coreString('moreOptions')"
        @click="isMenuOpen = !isMenuOpen"
      />
      <CoreMenu
        v-show="isMenuOpen"
        ref="menu"
        class="menu"
        :style="{
          left: isRtl ? '16px' : 'auto',
          right: isRtl ? 'auto' : '16px',
          position: 'absolute',
          zIndex: 7,
        }"
        :raised="true"
        :isOpen="isMenuOpen"
        :containFocus="true"
        @close="isMenuOpen = false"
        @shouldFocusFirstEl="findFirstEl()"
      >
        <template #options>
          <CoreMenuOption
            :style="{ cursor: 'pointer' }"
            @select="handleRemoveRequest"
          >
            {{ $tr('removeFromMyLibraryAction') }}
          </CoreMenuOption>
        </template>
      </CoreMenu>
    </div>
    <KModal
      v-if="removeConfirmationModalOpen"
      :title="$tr('removeFromMyLibraryAction')"
      :cancelText="coreString('cancelAction')"
      :submitText="coreString('removeAction')"
      size="medium"
      @cancel="removeConfirmationModalOpen = false"
      @submit="confirmRemoveRequest"
    >
      <p>{{ $tr('removeFromMyLibraryInfo') }}</p>
    </KModal>
  </div>

</template>


<script>

  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import CoreMenu from 'kolibri/components/CoreMenu';
  import CoreMenuOption from 'kolibri/components/CoreMenu/CoreMenuOption';
  import useUser from 'kolibri/composables/useUser';
  import ProgressBar from '../ProgressBar';
  import commonLearnStrings from '../commonLearnStrings';
  import useDownloadRequests from '../../composables/useDownloadRequests';

  export default {
    name: 'HybridLearningFooter',
    components: {
      CoachContentLabel,
      ProgressBar,
      CoreMenu,
      CoreMenuOption,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
    setup() {
      const { addDownloadRequest, downloadRequestMap, removeDownloadRequest } =
        useDownloadRequests();
      const { isLearner, isUserLoggedIn } = useUser();
      return {
        addDownloadRequest,
        downloadRequestMap,
        removeDownloadRequest,
        isLearner,
        isUserLoggedIn,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      allowDownloads: {
        type: Boolean,
        default: false,
      },
      bookmarked: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        isMenuOpen: false,
        disableRequestButtons: false,
        removeConfirmationModalOpen: false,
      };
    },
    computed: {
      isTopic() {
        return !this.contentNode.is_leaf;
      },
      downloadEnabled() {
        return !this.isTopic && this.allowDownloads;
      },
      downloadedByLearner() {
        return this.downloadEnabled && Boolean(this.downloadRequestMap[this.contentNode.id]);
      },
      downloadableByLearner() {
        return (
          this.downloadEnabled && !this.downloadedByLearner && !this.contentNode.admin_imported
        );
      },
      footerLength() {
        return (
          1 +
          Number(this.bookmarked) +
          Number(this.downloadableByLearner) +
          Number(this.isTopic) +
          Number(this.isUserLoggedIn && !this.isLearner && this.contentNode.num_coach_contents) +
          Number(this.downloadedByLearner)
        );
      },
      coachContentLabelStyles() {
        if (this.contentNode.num_coach_contents < 2 && !this.isTopic) {
          return { maxWidth: '24px', marginTop: '4px' };
        } else if (this.contentNode.num_coach_contents < 2 && this.isTopic) {
          return { maxWidth: '24px', marginTop: '4px', marginRight: '16px' };
        } else {
          return {};
        }
      },
    },
    methods: {
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.menu.focusFirstEl();
        });
      },
      handleDownloadRequest() {
        this.disableRequestButtons = true;
        this.addDownloadRequest(this.contentNode).then(() => {
          this.disableRequestButtons = false;
        });
      },
      handleRemoveRequest() {
        this.disableRequestButtons = true;
        this.isMenuOpen = false;
        this.removeConfirmationModalOpen = true;
        this.disableRequestButtons = false;
      },
      confirmRemoveRequest() {
        this.removeDownloadRequest(this.contentNode.id).then(() => {
          this.removeConfirmationModalOpen = false;
        });
      },
    },
    $trs: {
      removeFromMyLibraryAction: {
        message: 'Remove from my library',
        context: "Label for a button to remove a file from a learner's library",
      },
      removeFromMyLibraryInfo: {
        message:
          "You will no longer be able to use this resource, but you can download it again later when it's available around you.",
        context:
          'Information given to a user when confirming that they are removing a resource from their library.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './card';

  .footer {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    width: 100%;
    padding: $margin;
    margin-bottom: $margin-thin;
  }

  .progress-bar {
    position: absolute;
    bottom: 6px;
    left: $margin-thin;
  }

  .footer-icons {
    position: absolute;
    right: $margin-thin;
    bottom: 0;
    display: inline;
    // this override fixes an existing KDS bug with
    // the hover state circle being squished
    // and can be removed upon that hover state fix
    .button {
      width: 32px !important;
      height: 32px !important;

      /deep/ svg {
        top: 4px !important;
      }
    }
  }

  .coach-content-label {
    vertical-align: top;
  }

</style>
