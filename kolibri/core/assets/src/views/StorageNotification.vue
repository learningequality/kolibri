<template>

  <div v-if="bannerOpened" class="banner" :style="{ background: $themeTokens.surface }">
    <div class="banner-inner">
      <h1 style="display: none">
        Storage notification
      </h1>
      <KGrid>
        <!-- Grid Content -->
        <KGridItem :layout12="{ span: 12 }">
          <p>
            {{ getMessage() }}
          </p>
        </KGridItem>

        <!-- Grid Buttons -->
        <KGridItem class="button-grid-item" :layout12="{ span: 12 }">
          <KButton
            :text="coreString('closeAction')"
            style="margin-right: 10px"
            appearance="flat-button"
            :secondary="true"
            @click="closeBanner"
          />
          <KButton
            v-if="availableDownloads"
            :text="$tr('goToDownloads')"
            appearance="raised-button"
            :secondary="true"
            @click="closeBanner"
          />
          <KButton
            v-if="isSuperAdmin"
            :text="$tr('manageChannels')"
            appearance="raised-button"
            :secondary="true"
            @click="manageChannel"
          />
        </KGridItem>
      </KGrid>
    </div>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'StorageNotification',
    components: {},
    mixins: [commonCoreStrings],
    data() {
      return {
        bannerOpened: true,
        hasDevicePermissions: false,
        isSuperAdmin: true,
        availableDownloads: false,
        learnOnlyDevice: false,
        insufficientSpace: false,
        resourcesRemoved: false,
      };
    },
    computed: {
      insufficientStorageNoDownloads() {
        return (
          (this.learnOnlyDevice && this.insufficientSpace) ||
          (!this.hasDevicePermissions && !this.availableDownloads)
        );
      },
      learnOnlyRemovedResources() {
        return this.learnOnlyDevice && this.resourcesRemoved;
      },
      availableDownload() {
        return !this.hasDevicePermissions && this.availableDownloads && !this.learnOnlyDevice;
      },
    },
    created() {
      document.addEventListener('focusin', this.focusChange);
    },
    beforeDestroy() {
      document.removeEventListener('focusin', this.focusChange);
    },
    methods: {
      getMessage() {
        let message = '';
        if (this.isSuperAdmin) {
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
      closeBanner() {
        this.bannerOpened = false;
        if (this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus();
        }
      },
      manageChannel() {
        this.$router.push('/');
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
          'You do not have enough storage for new learning materials. Ask your coach or administrator for help.',
        context: ' ',
      },
      insufficientStorageAvailableDownloads: {
        message:
          'You do not have enough storage for updates. Try removing resources from My downloads.',
        context: ' ',
      },
      superAdminMessage: {
        message: 'You do not have enough storage for updates.',
        context: ' ',
      },
      resourcesRemoved: {
        message: 'Some resources have been removed to make room for new class materials.',
        context: ' ',
      },
      goToDownloads: {
        message: 'Go To My Downloads',
        context: ' ',
      },
      manageChannels: {
        message: 'Manage Channels',
        context: ' ',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .banner {
    @extend %dropshadow-16dp;

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

  .button-grid-item {
    display: flex;
    justify-content: flex-end;
    min-height: 60px;
  }

</style>
