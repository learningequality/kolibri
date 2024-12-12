<template>

  <div
    v-if="bannerOpened"
    class="banner"
    :style="{ background: $themeTokens.surface }"
  >
    <div class="banner-inner">
      <h1 style="display: none">
        {{ $tr('bannerHeading') }}
      </h1>
      <KGrid>
        <!-- Grid Content -->
        <KGridItem :layout12="{ span: 12 }">
          <p>
            {{ message }}
          </p>
        </KGridItem>

        <!-- Grid Buttons -->
        <KGridItem
          class="button-grid-item"
          :layout12="{ span: 12 }"
        >
          <div class="button-layout">
            <KButton
              :text="coreString('closeAction')"
              class="button-style"
              appearance="flat-button"
              :secondary="true"
              @click="closeBanner"
            />
            <KButton
              v-if="hasDownloads"
              :text="$tr('goToDownloads')"
              class="button-style"
              appearance="raised-button"
              :secondary="true"
              @click="openDownloads"
            />
            <KButton
              v-if="isAdmin"
              :text="$tr('manageChannels')"
              class="button-style"
              appearance="raised-button"
              :secondary="true"
              @click="manageChannel"
            />
          </div>
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import { useLocalStorage } from '@vueuse/core';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import { LearnerDeviceStatus } from 'kolibri/constants';
  import urls from 'kolibri/urls';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import useUserSyncStatus from 'kolibri/composables/useUserSyncStatus';

  export default {
    name: 'StorageNotification',
    components: {},
    mixins: [commonCoreStrings],
    setup() {
      const local_storage_last_synced = useLocalStorage('last_synced', '');
      const local_storage_lastDownloadRemoved = useLocalStorage('last_download_removed', '');

      const { isAdmin, isLearner, isLearnerOnlyImport, canManageContent } = useUser();

      const setLastSyncedValue = newLastSyncValue => {
        local_storage_last_synced.value = newLastSyncValue;
      };

      const setDownloadRemovedValue = newLastDownloadRemovedValue => {
        local_storage_lastDownloadRemoved.value = newLastDownloadRemovedValue;
      };

      const { lastSynced, deviceStatus, hasDownloads, lastDownloadRemoved } = useUserSyncStatus();

      const { sendAssertiveMessage } = useKLiveRegion();

      return {
        lastSynced,
        deviceStatus,
        hasDownloads,
        lastDownloadRemoved,
        isAdmin,
        isLearner,
        isLearnerOnlyImport,
        canManageContent,
        local_storage_last_synced,
        local_storage_lastDownloadRemoved,
        setLastSyncedValue,
        setDownloadRemovedValue,
        sendAssertiveMessage,
      };
    },
    data() {
      return {
        bannerOpened: false,
      };
    },
    computed: {
      message() {
        let message = '';
        if (this.isAdmin) {
          message = this.$tr('superAdminMessage');
        } else if (this.insufficientStorageNoDownloads) {
          message = this.$tr('insufficientStorageNoDownloads');
        } else if (this.learnOnlyRemovedResources) {
          message = this.$tr('resourcesRemoved');
        } else if (this.availableDownload) {
          message = this.$tr('insufficientStorageAvailableDownloads');
        }
        return message;
      },
      insufficientStorageNoDownloads() {
        return (
          (this.isLearner && this.insufficientStorage) ||
          (!this.canManageContent && !this.hasDownloads)
        );
      },
      insufficientStorage() {
        return this.deviceStatus === LearnerDeviceStatus.INSUFFICIENT_STORAGE;
      },
      learnOnlyRemovedResources() {
        return this.isLearner && this.lastDownloadRemoved && this.isLearnerOnlyImport;
      },
      availableDownload() {
        return !this.canManageContent && this.hasDownloads && !this.isLearner;
      },
      showBanner() {
        return (
          (this.insufficientStorage && this.local_storage_last_synced < this.lastSynced) ||
          this.local_storage_lastDownloadRemoved < this.lastDownloadRemoved
        );
      },
    },
    watch: {
      showBanner: {
        handler(newVal, oldValue) {
          if (newVal !== oldValue) {
            this.bannerOpened = newVal;
          }
        },
        deep: true,
        immediate: true,
      },
      message: {
        handler(newVal, oldVal) {
          if (newVal !== oldVal) {
            this.sendAssertiveMessage(this.message);
          }
        },
        immediate: true,
      },
    },
    mounted() {
      document.addEventListener('focusin', this.focusChange);
    },
    beforeDestroy() {
      document.removeEventListener('focusin', this.focusChange);
    },
    methods: {
      closeBanner() {
        this.setLastSyncedValue(this.lastSynced);
        this.setDownloadRemovedValue(this.lastDownloadRemoved);
        this.bannerOpened = false;

        if (this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus();
        }
      },
      openDownloads() {
        const downloadsUrl = urls['kolibri:kolibri.plugins.learn:my_downloads']();
        redirectBrowser(downloadsUrl);
      },
      manageChannel() {
        const deviceManagementUrl = urls['kolibri:kolibri.plugins.device:device_management'];
        if (this.canManageContent && deviceManagementUrl) {
          redirectBrowser(deviceManagementUrl());
        } else {
          this.bannerOpened = false;
        }
      },

      focusChange(e) {
        // We need the element prior to the close button and more info
        if (
          (this.$refs.close_button && e.target != this.$refs.close_button.$el) ||
          (this.$refs.open_button && e.target != this.$refs.open_button.$el)
        ) {
          this.previouslyFocusedElement = e.target;
        }
      },
    },
    $trs: {
      insufficientStorageNoDownloads: {
        message:
          'You do not have enough storage for new resources. Ask your coach or administrator for help.',
        context:
          'Shown to the learner when their device has exhausted storage space for additional materials',
      },
      insufficientStorageAvailableDownloads: {
        message:
          'You do not have enough storage for new resources. Remove some resources from My downloads.',
        context:
          'Shown to the learner when their device has exhausted storage space for additional materials, but they have manually download materials that could be removed to make space',
      },
      superAdminMessage: {
        message: 'You do not have enough storage for new resources',
        context:
          'Shown to the admin when the device has exhausted storage space for additional materials',
      },
      resourcesRemoved: {
        message: 'Some resources have been removed to make room for new lessons or quizzes',
        context:
          'Shown to the learner when learning materials were automatically removed to make space for new materials',
      },
      goToDownloads: {
        message: 'Go to My Downloads',
        context:
          'Text for a button that takes the learner to a page where they can remove downloaded materials',
      },
      manageChannels: {
        message: 'Manage channels',
        context:
          'Text for a button that takes the admin to a page where they can remove imported channels',
      },
      bannerHeading: {
        message: 'Storage notification',
        context: 'Visually hidden heading of the storage notification banner',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .banner {
    @extend %dropshadow-6dp;

    position: relative;
    width: 100%;
    margin: 0 auto;
  }

  .banner-inner {
    max-width: 1000px;
    padding-top: 0;
    padding-right: 16px;
    padding-left: 16px;
    margin: 0 auto;
  }

  @media (min-width: 509px) {
    .button-style {
      margin-right: 10px;
    }

    .button-grid-item {
      display: flex;
      justify-content: flex-end;
      min-height: 60px;
    }
  }
  @media (max-width: 509px) {
    .button-style {
      margin-bottom: 10px;
    }

    .button-layout {
      display: flex;
      flex-direction: column;
    }
  }

</style>
