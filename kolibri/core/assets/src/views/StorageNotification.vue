<template>

  <div v-if="bannerOpened" class="banner" :style="{ background: $themeTokens.surface }">
    <div class="banner-inner">
      <h1 style="display: none">
        {{ $tr('bannerHeading') }}
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
            v-if="isAdmin"
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
  import useUser from 'kolibri.coreVue.composables.useUser';
  import { mapGetters } from 'vuex';

  export default {
    name: 'StorageNotification',
    components: {},
    mixins: [commonCoreStrings],
    setup() {
      const { isLearnerOnlyImport } = useUser();
      return {
        isLearnerOnlyImport,
      };
    },
    props: {
      showBanner: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        bannerOpened: false,
        // TODO: remove this
        insufficientSpace: true,
        // TODO: retrieve proper info for these
        hasDevicePermissions: false,
        availableDownloads: false,
        resourcesRemoved: false,
      };
    },
    computed: {
      ...mapGetters(['isLearner', 'isAdmin']),
      insufficientStorageNoDownloads() {
        return (
          (this.isLearner && this.insufficientSpace) ||
          (!this.hasDevicePermissions && !this.availableDownloads)
        );
      },
      learnOnlyRemovedResources() {
        return this.isLearner && this.resourcesRemoved && this.isLearnerOnlyImport;
      },
      availableDownload() {
        return !this.hasDevicePermissions && this.availableDownloads && !this.isLearner;
      },
    },
    created() {
      this.toggleBanner();
      document.addEventListener('focusin', this.focusChange);
    },
    beforeDestroy() {
      document.removeEventListener('focusin', this.focusChange);
    },
    methods: {
      getMessage() {
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
      closeBanner() {
        // TODO: Store preference after closure
        this.bannerOpened = false;
        if (this.previouslyFocusedElement) {
          this.previouslyFocusedElement.focus();
        }
      },
      manageChannel() {
        this.$router.push('/');
      },
      toggleBanner() {
        if (this.showBanner) {
          this.bannerOpened = true;
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
