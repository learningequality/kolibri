<template>

  <div v-show="!$isPrint" :style="{ backgroundColor: $themeTokens.appBar }">

    <SkipNavigationLink />

    <UiToolbar
      :title="title"
      type="clear"
      textColor="white"
      class="app-bar"
      :style="{ height: height + 'px' }"
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

      <template #actions>
        <div>
          <slot name="app-bar-actions"></slot>
          <div class="total-points">
            <slot name="totalPointsMenuItem"></slot>
          </div>

          <UiButton
            ref="userMenuButton"
            type="primary"
            color="clear"
            class="user-menu-button"
            :class="$computedClass({ ':focus': $coreOutline })"
            :ariaLabel="$tr('userMenu')"
            @click="handleUserMenuButtonClick"
          >
            <template #icon>
              <KIcon
                icon="person"
                :style="{ fill: $themeTokens.textInverted, height: '24px', width: '24px', top: 0, }"
              />
            </template>
            <span v-if="isUserLoggedIn" class="username" tabindex="-1">{{ dropdownName }}</span>
            <KIcon
              icon="dropdown"
              :style="{ fill: $themeTokens.textInverted, height: '24px', width: '24px', top: 0, }"
            />
          </UiButton>

          <CoreMenu
            v-show="userMenuDropdownIsOpen"
            ref="userMenuDropdown"
            class="user-menu-dropdown"
            :isOpen="userMenuDropdownIsOpen"
            :raised="true"
            :containFocus="true"
            :showActive="false"
            :style="{ backgroundColor: $themeTokens.surface }"
            @close="handleCoreMenuClose"
            @shouldFocusFirstEl="findFirstEl()"
          >
            <template v-if="isUserLoggedIn" #header>
              <div class="role">
                {{ coreString('userTypeLabel') }}
              </div>
              <div>
                <UserTypeDisplay
                  :distinguishCoachTypes="false"
                  :userType="getUserKind"
                />
              </div>
              <div v-if="isSubsetOfUsersDevice && userIsLearner" data-test="syncStatusInDropdown">
                <div class="sync-status">
                  {{ $tr('deviceStatus') }}
                </div>
                <SyncStatusDisplay
                  :syncStatus="mapSyncStatusOptionToLearner"
                  displaySize="large"
                />
              </div>
            </template>

            <template #options>
              <component :is="component" v-for="component in menuOptions" :key="component.name" />
              <CoreMenuOption
                :label="$tr('languageSwitchMenuOption')"
                icon="language"
                style="cursor: pointer;"
                @select="handleChangeLanguage"
              />
              <LogoutSideNavEntry v-if="isUserLoggedIn" />
            </template>

            <template #footer>
              <!-- Only show this when on a SoUD -->
              <div v-if="showSoudNotice" class="role" data-test="learnOnlyNotice">
                <LearnOnlyDeviceNotice />
              </div>
            </template>
          </CoreMenu>

        </div>
      </template>
    </UiToolbar>
    <div class="subpage-nav">
      <slot name="sub-nav"></slot>
    </div>
  </div>

</template>


<script>

  import { mapGetters, mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import LearnOnlyDeviceNotice from 'kolibri.coreVue.components.LearnOnlyDeviceNotice';
  import KIconButton from 'kolibri-design-system/lib/buttons-and-links/KIconButton';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import UiButton from 'kolibri-design-system/lib/keen/UiButton';
  import navComponents from 'kolibri.utils.navComponents';
  import { NavComponentSections, SyncStatus, UserKinds } from 'kolibri.coreVue.vuex.constants';
  import themeConfig from 'kolibri.themeConfig';
  import navComponentsMixin from '../mixins/nav-components';
  import LogoutSideNavEntry from './LogoutSideNavEntry';
  import SkipNavigationLink from './SkipNavigationLink';
  import SyncStatusDisplay from './SyncStatusDisplay';
  import plugin_data from 'plugin_data';

  const hashedValuePattern = /^[a-f0-9]{30}$/;

  export default {
    name: 'AppBar',
    components: {
      UiToolbar,
      KIconButton,
      CoreMenu,
      UiButton,
      CoreMenuOption,
      LearnOnlyDeviceNotice,
      LogoutSideNavEntry,
      UserTypeDisplay,
      SkipNavigationLink,
      SyncStatusDisplay,
    },
    mixins: [commonCoreStrings, navComponentsMixin],
    setup() {
      return { themeConfig };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        userMenuDropdownIsOpen: false,
        userSyncStatus: null,
        isPolling: false,
        // poll every 10 seconds
        pollingInterval: 10000,
        isSubsetOfUsersDevice: plugin_data['isSubsetOfUsersDevice'],
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'getUserKind', 'isAdmin', 'isCoach']),
      ...mapState({
        username: state => state.core.session.username,
        fullName: state => state.core.session.full_name,
        userId: state => state.core.session.user_id,
      }),
      userIsLearner() {
        return this.getUserKind == UserKinds.LEARNER;
      },
      showSoudNotice() {
        return this.isSubsetOfUsersDevice && (this.isAdmin || this.isCoach);
      },
      menuOptions() {
        return navComponents
          .filter(component => component.section === NavComponentSections.ACCOUNT)
          .filter(this.filterByRole);
      },
      // temp hack for the VF plugin
      dropdownName() {
        return !hashedValuePattern.test(this.username) ? this.username : this.fullName;
      },
      mapSyncStatusOptionToLearner() {
        if (this.userSyncStatus) {
          return this.userSyncStatus.status;
        }
        return SyncStatus.NOT_CONNECTED;
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
      handleUserMenuButtonClick(event) {
        this.userMenuDropdownIsOpen = !this.userMenuDropdownIsOpen;
        if (this.userMenuDropdownIsOpen) {
          this.$nextTick(() => {
            this.$refs.userMenuDropdown.$el.focus();
            this.isPolling = true;
            this.pollUserSyncStatusTask(this.userId);
          });
        } else if (!this.userMenuDropdownIsOpen) {
          this.isPolling = false;
        }
        return event;
      },
      handleWindowClick(event) {
        if (
          !this.$refs.userMenuDropdown.$el.contains(event.target) &&
          !this.$refs.userMenuButton.$el.contains(event.target) &&
          this.userMenuDropdownIsOpen
        ) {
          this.userMenuDropdownIsOpen = false;
          this.isPolling = false;
        }
        return event;
      },
      handleCoreMenuClose() {
        this.userMenuDropdownIsOpen = false;
        this.isPolling = false;
        if (this.$refs.userMenuButton) {
          this.$refs.userMenuButton.$el.focus();
        }
      },
      handleChangeLanguage() {
        this.$emit('showLanguageModal');
        this.userMenuDropdownIsOpen = false;
        this.isPolling = false;
      },
      findFirstEl() {
        this.$nextTick(() => {
          this.$refs.userMenuDropdown.focusFirstEl();
        });
      },
    },
    $trs: {
      openNav: {
        message: 'Open site navigation',
        context:
          "This message is providing additional context to the screen-reader users, but is not visible in the Kolibri UI.\n\nIn this case the screen-reader will announce the message when user navigates to the 'hamburger' button with the keyboard, to indicate that it allows them to open the sidebar navigation menu.",
      },
      languageSwitchMenuOption: {
        message: 'Change language',
        context:
          'General user setting where a user can choose the language they want to view the Kolibri interface in.',
      },
      userMenu: {
        message: 'User menu',
        context:
          'The user menu is located in the upper right corner of the interface. \n\nUsers can use it to adjust their settings like the language used in Kolibri or their name.',
      },
      deviceStatus: {
        message: 'Device status',
        context:
          "Table column header in the 'Class learners' page. Indicates the status of an individual learner's device.",
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
    // overflow: hidden on both x and y so that the -y doesn't show scroll buttons
    // at certain zooms/screen sizes
    overflow: hidden;
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

  .sync-status,
  .notice-label {
    margin-top: 16px;
    margin-bottom: 8px;
    font-size: small;
    font-weight: bold;
  }

  .total-points {
    display: inline-block;
    margin-left: 16px;
  }

  /deep/ .ui-toolbar__brand {
    min-width: inherit;
  }

  /deep/ .ui-toolbar__title {
    margin-right: 10px;
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
