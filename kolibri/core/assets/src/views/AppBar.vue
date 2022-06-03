<template>

  <div v-show="!$isPrint" :style="{ backgroundColor: $themeTokens.appBar }">

    <SkipNavigationLink />

    <UiToolbar
      :title="title"
      type="clear"
      textColor="white"
      class="app-bar"
      :style="{ height: topBarHeight + 'px' }"
      :raised="false"
      :removeBrandDivider="true"
    >
      <template #icon>
        <KIconButton
          icon="menu"
          :color="$themeTokens.textInverted"
          :ariaLabel="$tr('openNav')"
          @click="$emit('toggleSideNav')"
        />
      </template>

      <template #brand>
        <img
          v-if="themeConfig.appBar.topLogo"
          :src="themeConfig.appBar.topLogo.src"
          :alt="themeConfig.appBar.topLogo.alt"
          :style="themeConfig.appBar.topLogo.style"
          class="brand-logo"
        >
      </template>

      <template v-if="windowIsLarge" #navigation>
        <slot name="sub-nav"></slot>
      </template>

      <template #actions>
        <div>
          <slot name="app-bar-actions"></slot>
          <div class="total-points">
            <slot name="totalPointsMenuItem"></slot>
          </div>
          <span v-if="isUserLoggedIn" class="username" tabindex="-1">
            <KIcon
              icon="person"
              :style="{
                fill: $themeTokens.textInverted,
                height: '24px',
                width: '24px',
                margin: '4px',
                top: '8px',
              }"
            />
            {{ usernameForDisplay }}
          </span>

        </div>
      </template>
    </UiToolbar>
    <div v-if="!windowIsLarge" class="subpage-nav">
      <slot name="sub-nav"></slot>
    </div>
  </div>

</template>


<script>

  import { mapGetters, mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import KIconButton from 'kolibri-design-system/lib/buttons-and-links/KIconButton';
  import { SyncStatus } from 'kolibri.coreVue.vuex.constants';
  import themeConfig from 'kolibri.themeConfig';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import navComponentsMixin from '../mixins/nav-components';
  import SkipNavigationLink from './SkipNavigationLink';
  import plugin_data from 'plugin_data';

  const hashedValuePattern = /^[a-f0-9]{30}$/;

  export default {
    name: 'AppBar',
    components: {
      UiToolbar,
      KIconButton,
      SkipNavigationLink,
    },
    mixins: [commonCoreStrings, navComponentsMixin, responsiveWindowMixin],
    setup() {
      return { themeConfig };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        userSyncStatus: null,
        isPolling: false,
        // poll every 10 seconds
        pollingInterval: 10000,
        isSubsetOfUsersDevice: plugin_data['isSubsetOfUsersDevice'],
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState({
        username: state => state.core.session.username,
        fullName: state => state.core.session.full_name,
        userId: state => state.core.session.user_id,
      }),
      // temp hack for the VF plugin
      usernameForDisplay() {
        return !hashedValuePattern.test(this.username) ? this.username : this.fullName;
      },
    },
    created() {
      window.addEventListener('click', this.handleWindowClick);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleWindowClick);
      this.isPolling = false;
    },
    methods: {
      ...mapActions(['fetchUserSyncStatus']),
      pollUserSyncStatusTask() {
        this.fetchUserSyncStatus({ user: this.userId }).then(syncData => {
          if (syncData && syncData[0]) {
            this.userSyncStatus = syncData[0];
            this.setPollingInterval(this.userSyncStatus.status);
          }
        });
        if (this.isPolling && this.isSubsetOfUsersDevice) {
          setTimeout(() => {
            this.pollUserSyncStatusTask();
          }, this.pollingInterval);
        }
      },
      setPollingInterval(status) {
        if (status === SyncStatus.QUEUED) {
          // check more frequently for updates if the user is waiting to sync,
          // so that the sync isn't missed
          this.pollingInterval = 1000;
        } else {
          this.pollingInterval = 10000;
        }
      },
    },
    $trs: {
      openNav: {
        message: 'Open site navigation',
        context:
          "This message is providing additional context to the screen-reader users, but is not visible in the Kolibri UI.\n\nIn this case the screen-reader will announce the message when user navigates to the 'hamburger' button with the keyboard, to indicate that it allows them to open the sidebar navigation menu.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .user-menu-button {
    text-transform: none;
    vertical-align: middle;
  }

  .username {
    max-width: 200px;
    // overflow-x hidden seems to affect overflow-y also, so include a fixed height
    height: 16px;
    padding-left: 8px;
    // overflow: hidden on both x and y so that the -y doesn't show scroll buttons
    // at certain zooms/screen sizes
    overflow: hidden;
    font-size: small;
    font-weight: bold;
    text-overflow: ellipsis;
  }

  @media (max-width: 750px) {
    .username {
      max-width: 50px;
    }
  }

  // Holdover from keen-ui to keep dropdown profile correctly formatted.
  /deep/ .ui-menu {
    min-width: 10.5rem;
    max-width: 17rem;
    max-height: 100vh;
    padding: 0.25rem 0;
    margin: 0;
    overflow-x: hidden;
    overflow-y: auto;
    list-style: none;
    background-color: inherit;
    border: 0.0625rem solid rgba(0, 0, 0, 0.08);
    outline: none;
  }

  .user-menu-dropdown {
    position: fixed;
    right: 8px;
    z-index: 8;
  }

  .role {
    margin-bottom: 8px;
    font-size: small;
    font-weight: bold;
  }

  .total-points {
    display: inline-block;
    margin-left: 16px;
  }

  /deep/ .ui-toolbar__body {
    display: inline-block;
    margin-bottom: 12px;
  }

  /deep/ .ui-toolbar__title {
    display: flex;
    align-items: center;
  }

  /deep/ .ui-toolbar__nav-icon {
    display: flex;
    align-items: center;
  }

  .brand-logo {
    max-width: 48px;
    max-height: 48px;
    margin-right: 8px;
    vertical-align: middle;
  }

  // Hide the UiButton focus ring
  /deep/ .ui-button__focus-ring {
    display: none;
  }

</style>
