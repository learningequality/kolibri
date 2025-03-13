<template>

  <div
    ref="sideNav"
    class="side-nav-wrapper"
    tabindex="0"
    @keyup.esc="toggleNav"
  >
    <transition :name="showAppNavView ? 'bottom-nav' : 'side-nav'">
      <div
        v-show="navShown"
        ref="sideNavInside"
        class="side-nav"
        :class="showAppNavView ? 'bottom-offset' : ''"
        :style="{
          width: `${width}`,
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
        }"
      >
        <KFocusTrap
          @shouldFocusFirstEl="$emit('shouldFocusFirstEl')"
          @shouldFocusLastEl="focusLastEl"
        >
          <div
            :class="showAppNavView ? 'bottom-nav-scrollable-area' : 'side-nav-scrollable-area'"
            :style="
              showAppNavView
                ? { width: `${width}` }
                : { top: `${topBarHeight}px`, width: `${width}` }
            "
          >
            <img
              v-if="themeConfig.sideNav.topLogo"
              class="logo"
              :src="themeConfig.sideNav.topLogo.src"
              :alt="themeConfig.sideNav.topLogo.alt"
              :style="themeConfig.sideNav.topLogo.style"
            >

            <div
              v-if="userIsLearner || showAppNavView"
              class="user-information"
            >
              <div
                v-if="showAppNavView"
                style="margin-bottom: 10px; margin-left: -15px"
              >
                <KIconButton
                  ref="closeButton"
                  icon="close"
                  class="side-nav-header-icon"
                  @click="toggleNav"
                />
              </div>
              <!-- display user details -->
              <TotalPoints class="points" />
              <b>{{ fullName }}</b>
              <p
                :style="{
                  color: $themeTokens.annotation,
                  fontSize: '12px',
                  marginTop: '8px',
                  marginBottom: 0,
                }"
              >
                {{ username }}
              </p>
              <p :style="{ color: $themeTokens.annotation, fontSize: '12px', marginTop: 0 }">
                {{ loggedInUserKind }}
              </p>

              <!-- display sync status, when relevant -->
              <div v-if="isLearnerOnlyImport">
                <div class="sync-status">
                  {{ $tr('deviceStatus') }}
                </div>
                <SyncStatusDisplay
                  :syncStatus="userSyncStatus"
                  :lastSynced="userLastSynced"
                  displaySize="small"
                />
              </div>
            </div>
            <SideNavDivider
              v-if="userIsLearner"
              :style="{ listStyleType: 'none' }"
            />
            <CoreMenu
              ref="coreMenu"
              role="navigation"
              :style="{ backgroundColor: $themeTokens.surface, width: width }"
              :aria-label="$tr('navigationLabel')"
            >
              <template #options>
                <CoreMenuOption
                  v-for="item in topItems"
                  :key="item.name"
                  :label="item.label"
                  :subRoutes="item.routes"
                  :link="item.url"
                  :icon="item.icon"
                  :linkActive="item.active"
                  data-test="side-nav-item"
                  @toggleMenu="toggleNav"
                />
                <SideNavDivider />
                <CoreMenuOption
                  v-for="item in accountItems"
                  :key="item.name"
                  :label="item.label"
                  :subRoutes="item.routes"
                  :link="item.url"
                  :icon="item.icon"
                  :linkActive="item.active"
                  style="cursor: pointer"
                  data-test="side-nav-item"
                  @toggleMenu="toggleNav"
                />
                <CoreMenuOption
                  v-if="logoutUrl && isUserLoggedIn"
                  :label="$tr('signOut')"
                  :link="logoutUrl"
                  icon="logout"
                />
                <CoreMenuOption
                  :label="coreString('changeLanguageOption')"
                  icon="language"
                  class="pointer"
                  @select="handleShowLanguageModal"
                  @toggleMenu="toggleNav"
                />
                <SideNavDivider />
              </template>
            </CoreMenu>

            <div
              v-if="showSoudNotice"
              style="padding: 16px"
            >
              <LearnOnlyDeviceNotice />
            </div>

            <div
              class="side-nav-scrollable-area-footer"
              :style="{ color: $themeTokens.annotation }"
            >
              <!-- custom branded footer logo + text -->
              <template v-if="themeConfig.sideNav.brandedFooter">
                <img
                  v-if="themeConfig.sideNav.brandedFooter.logo"
                  class="side-nav-scrollable-area-footer-logo"
                  :src="themeConfig.sideNav.brandedFooter.logo.src"
                  :alt="themeConfig.sideNav.brandedFooter.logo.alt"
                  :style="themeConfig.sideNav.brandedFooter.logo.style"
                >
                <div
                  v-if="
                    themeConfig.sideNav.brandedFooter.paragraphArray &&
                      themeConfig.sideNav.brandedFooter.paragraphArray.length
                  "
                  class="side-nav-scrollable-area-footer-info"
                >
                  <p
                    v-for="(line, index) in themeConfig.sideNav.brandedFooter.paragraphArray"
                    :key="index"
                  >
                    {{ line }}
                  </p>
                </div>
              </template>
              <!-- Kolibri footer logo -->
              <CoreLogo
                v-if="themeConfig.sideNav.showKolibriFooterLogo"
                class="side-nav-scrollable-area-footer-logo"
              />
              <div class="side-nav-scrollable-area-footer-info">
                <p>{{ footerMsg }}</p>
                <!-- Not translated -->
                <p>© {{ copyrightYear }} Learning Equality</p>
                <p>
                  <KButton
                    ref="privacyLink"
                    :text="coreString('usageAndPrivacyLabel')"
                    class="privacy-link"
                    appearance="basic-link"
                    @click="handleClickPrivacyLink"
                  />
                </p>
              </div>
            </div>
          </div>
          <div
            v-if="!showAppNavView || windowIsLarge"
            class="side-nav-header"
            :style="{
              height: topBarHeight + 'px',
              width: `${width}`,
              paddingTop: windowIsSmall ? '4px' : '8px',
              backgroundColor: themeConfig.appBar.background,
              color: themeConfig.appBar.textColor,
            }"
          >
            <KIconButton
              ref="closeButton"
              tabindex="0"
              icon="close"
              :color="themeConfig.appBar.textColor"
              class="side-nav-header-icon"
              :ariaLabel="$tr('closeNav')"
              size="large"
              @click="toggleNav"
            />
            <span
              class="side-nav-header-name"
              :style="{ color: themeConfig.appBar.textColor }"
            >{{ sideNavTitleText }}</span>
          </div>
        </KFocusTrap>
      </div>
    </transition>

    <BottomNavigationBar
      v-if="showAppNavView"
      :bottomMenuItem="bottomMenuItem"
      :navShown="navShown"
      @toggleNav="toggleNav"
    />

    <Backdrop
      v-show="navShown && !showAppNavView"
      :transitions="true"
      class="side-nav-backdrop"
      @click="toggleNav"
    />

    <PrivacyInfoModal
      v-if="privacyModalVisible"
      @cancel="privacyModalVisible = false"
      @submit="privacyModalVisible = false"
    />

    <LanguageSwitcherModal
      v-if="languageModalShown"
      ref="languageSwitcherModal"
      :style="{ color: $themeTokens.text }"
      @cancel="languageModalShown = false"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { UserKinds, NavComponentSections } from 'kolibri/constants';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import CoreMenu from 'kolibri/components/CoreMenu';
  import CoreMenuOption from 'kolibri/components/CoreMenu/CoreMenuOption';
  import CoreLogo from 'kolibri/components/CoreLogo';
  import PrivacyInfoModal from 'kolibri/components/PrivacyInfoModal';
  import themeConfig from 'kolibri/styles/themeConfig';
  import Backdrop from 'kolibri/components/Backdrop';
  import LanguageSwitcherModal from 'kolibri/components/language-switcher/LanguageSwitcherModal';
  import urls from 'kolibri/urls';
  import useNav from 'kolibri/composables/useNav';
  import useUser from 'kolibri/composables/useUser';
  import useUserSyncStatus from 'kolibri/composables/useUserSyncStatus';
  import { useSwipe } from '@vueuse/core';
  import { ref, getCurrentInstance } from 'vue';
  import SyncStatusDisplay from '../../../SyncStatusDisplay';
  import LearnOnlyDeviceNotice from './LearnOnlyDeviceNotice';
  import TotalPoints from './TotalPoints';
  import SideNavDivider from './SideNavDivider';
  import BottomNavigationBar from './BottomNavigationBar';

  // Explicit ordered list of roles for nav item sorting
  const navItemRoleOrder = [
    UserKinds.ANONYMOUS,
    UserKinds.LEARNER,
    UserKinds.COACH,
    UserKinds.ADMIN,
    UserKinds.CAN_MANAGE_CONTENT,
    UserKinds.SUPERUSER,
  ];

  export default {
    name: 'SideNav',
    components: {
      Backdrop,
      CoreMenu,
      CoreMenuOption,
      CoreLogo,
      LearnOnlyDeviceNotice,
      SyncStatusDisplay,
      SideNavDivider,
      PrivacyInfoModal,
      TotalPoints,
      LanguageSwitcherModal,
      BottomNavigationBar,
    },
    mixins: [commonCoreStrings],
    setup(props, { emit }) {
      const instance = getCurrentInstance();
      const isRtl = instance?.proxy.isRtl;

      const sideNavInside = ref(null);
      useSwipe(sideNavInside, {
        threshold: 100,
        onSwipeEnd: (e, direction) => {
          if (direction === 'left' && !isRtl) {
            emit('toggleSideNav');
          } else if (direction === 'right' && isRtl) {
            emit('toggleSideNav');
          }
        },
      });
      const { windowIsSmall, windowIsLarge } = useKResponsiveWindow();
      const {
        canManageContent,
        isLearner,
        isSuperuser,
        isAdmin,
        isCoach,
        isUserLoggedIn,
        isLearnerOnlyImport,
        username,
        full_name,
      } = useUser();
      const { status, lastSynced } = useUserSyncStatus();
      const { topBarHeight, navItems } = useNav();
      return {
        fullName: full_name,
        username,
        topBarHeight,
        windowIsLarge,
        windowIsSmall,
        canManageContent,
        isLearner,
        isSuperuser,
        isAdmin,
        isCoach,
        isUserLoggedIn,
        isLearnerOnlyImport,
        themeConfig,
        userSyncStatus: status,
        userLastSynced: lastSynced,
        navItems,
        sideNavInside,
      };
    },
    props: {
      navShown: {
        type: Boolean,
        required: true,
      },
      showAppNavView: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        // __copyrightYear is injected by Webpack DefinePlugin
        copyrightYear: __copyrightYear,
        privacyModalVisible: false,
        languageModalShown: false,
      };
    },
    computed: {
      width() {
        return this.showAppNavView ? '100vw' : `${this.topBarHeight * 4.5}px`;
      },
      showSoudNotice() {
        return this.isLearnerOnlyImport && (this.isSuperuser || this.isAdmin || this.isCoach);
      },
      footerMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      topItems() {
        return this.navItems
          .filter(item => item.section !== NavComponentSections.ACCOUNT)
          .sort(this.compareMenuItems)
          .filter(this.filterByRole)
          .filter(this.filterByFullFacilityOnly);
      },
      accountItems() {
        const accountItems = this.navItems
          .filter(item => item.section === NavComponentSections.ACCOUNT)
          .sort(this.compareMenuItems);

        return [...accountItems].filter(this.filterByRole).filter(this.filterByFullFacilityOnly);
      },
      bottomMenuItem() {
        const allNavItems = this.topItems.concat(this.accountItems);
        const bottombarItems = allNavItems.filter(item => item.bottomBar == true);
        if (bottombarItems.length > 0) {
          return bottombarItems[0];
        }
        return allNavItems.find(item => item.active);
      },
      sideNavTitleText() {
        if (this.themeConfig.sideNav.title) {
          return this.themeConfig.sideNav.title;
        }
        return this.coreString('kolibriLabel');
      },
      userIsLearner() {
        // learners and SOUD learners should display
        return this.isLearner || (this.isUserLoggedIn && this.isLearnerOnlyImport);
      },
      loggedInUserKind() {
        if (this.userIsLearner) {
          return this.coreString('learnerLabel');
        }
        if (this.isAdmin) {
          return this.coreString('adminLabel');
        }
        if (this.isCoach) {
          return this.coreString('coachLabel');
        }
        return this.coreString('superAdminLabel');
      },
      logoutUrl() {
        return urls['kolibri:core:logout'] && urls['kolibri:core:logout']();
      },
    },
    watch: {
      navShown(isShown) {
        this.$nextTick(() => {
          if (isShown) {
            this.focusFirstEl();
          }
        });
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.$emit('shouldFocusFirstEl');
      });
    },
    created() {
      window.addEventListener('click', this.handleWindowClick);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleWindowClick);
    },

    methods: {
      filterByRole(navItem) {
        if (!navItem.role) {
          // No role defined, so always show
          return true;
        }
        if (navItem.role === UserKinds.COACH) {
          return this.isCoach || this.isAdmin || this.isSuperuser;
        }
        if (navItem.role === UserKinds.ADMIN) {
          return this.isAdmin || this.isSuperuser;
        }
        if (navItem.role === UserKinds.CAN_MANAGE_CONTENT) {
          return this.canManageContent || this.isSuperuser;
        }
        if (navItem.role === UserKinds.SUPERUSER) {
          return this.isSuperuser;
        }
        if (navItem.role === UserKinds.ANONYMOUS) {
          return !this.isUserLoggedIn;
        }
        if (navItem.role === UserKinds.LEARNER) {
          return this.isLearner || this.isCoach || this.isAdmin || this.isSuperuser;
        }
      },
      toggleNav() {
        this.$emit('toggleSideNav');
      },
      handleShowLanguageModal() {
        this.languageModalShown = true;
      },
      handleClickPrivacyLink() {
        this.privacyModalVisible = true;
        this.toggleNav();
      },
      compareMenuItems(navItemA, navItemB) {
        // Compare menu items to allow sorting by the following priority:
        // Sort by role
        // Nav items with no roles will be placed first
        // as index will be -1
        if (navItemA.role !== navItemB.role) {
          return navItemRoleOrder.indexOf(navItemA.role) - navItemRoleOrder.indexOf(navItemB.role);
        }
        // Still no difference?
        // Sort by the URL to ensure consistent ordering
        return navItemA.url.localeCompare(navItemB.url);
      },
      filterByFullFacilityOnly(item) {
        return !this.isLearnerOnlyImport || !item.fullFacilityOnly;
      },

      /**
       * @public
       * Focuses on correct first element for FocusTrap.
       */
      focusFirstEl() {
        this.$nextTick(() => {
          this.$refs.coreMenu.focusFirstEl();
        });
      },
      focusLastEl() {
        this.$refs.closeButton.$el.focus();
      },
    },
    $trs: {
      navigationLabel: {
        message: 'Main user menu',
        context:
          'Refers to the main side navigation bar. The message is providing additional context to the screen-reader users, but is not visible in the Kolibri UI.',
      },
      closeNav: {
        message: 'Close navigation',
        context:
          "This message is providing additional context to the screen-reader users, but is not visible in the Kolibri UI.\n\nIn this case the screen-reader will announce the message when user navigates to the 'X' button with the keyboard, to indicate that it allows them to close the sidebar navigation menu. (Note that the sidebar needs to have been previously opened)",
      },
      poweredBy: {
        message: 'Kolibri {version}',
        context:
          'Indicates the current version of Kolibri.\n\nFor languages with non-latin scripts, Kolibri should be transcribed phonetically into the target language, similar to a person\'s name. It should not be translated as "hummingbird".',
      },
      deviceStatus: {
        message: 'Device status',
        context:
          "Label in the side navigation menu. Indicates the status of an individual learner's device.",
      },
      signOut: {
        message: 'Sign out',
        context:
          "Users can exit Kolibri by selecting 'Sign out' from the user menu in the upper right corner.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // Matches the KToolbar box-shadow property
  %k-toolbar-box-shadow {
    box-shadow:
      0 0 2px rgba(0, 0, 0, 0.12),
      0 2px 2px rgba(0, 0, 0, 0.2);
  }

  .side-nav-wrapper {
    overflow-x: hidden;
  }

  .side-nav {
    @extend %dropshadow-6dp;

    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 16;
  }

  .side-nav-enter {
    transform: translate3d(-100%, 0, 0);
  }

  .side-nav-enter-active {
    transition: all 0.2s ease-in-out;
  }

  .side-nav-enter-to {
    transform: translate3d(0, 0, 0);
  }

  .side-nav-leave {
    transform: translate3d(0, 0, 0);
  }

  .side-nav-leave-active {
    transition: all 0.2s ease-in-out;
  }

  .side-nav-leave-to {
    transform: translate3d(-100%, 0, 0);
  }

  .side-nav-header {
    @extend %k-toolbar-box-shadow;

    position: fixed;
    top: 0;
    left: 0;
    z-index: 17;
    font-size: 14px;
  }

  .side-nav-header-icon {
    margin-left: 5px; /* align with a toolbar icon below */
  }

  .side-nav-header-name {
    margin-left: 8px;
    font-size: 18px;
    font-weight: bold;
    vertical-align: middle;
  }

  .side-nav-scrollable-area {
    position: fixed;
    bottom: 0;
    left: 0;
    padding-top: 4px;
    overflow: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }

  .bottom-nav-scrollable-area {
    position: fixed;
    top: 0;
    left: 0;
    width: 95vw;
    height: 100%;
    padding-top: 4px;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .side-nav-scrollable-area-footer {
    padding: 16px;
    margin-bottom: 40px;
  }

  .side-nav-scrollable-area-footer-logo {
    max-width: 100%;
    height: 77px;
  }

  .pointer {
    cursor: pointer;
  }

  .user-information {
    position: relative;
    margin-top: 24px;
    margin-left: 24px;
    font-size: 14px;
  }

  .sync-status {
    margin-bottom: 8px;
    font-size: small;
    font-weight: bold;
  }

  .points {
    float: right;
    margin-top: -5px;
    margin-right: 16px;
    margin-left: auto;

    .description {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .side-nav-scrollable-area-footer-info {
    margin-top: 8px;
    font-size: 12px;
    line-height: 16px;

    p {
      margin: 0;
    }
  }

  .side-nav-backdrop {
    z-index: 15;
  }

  /* keen menu */
  /deep/ .ui-menu {
    max-width: none;
    max-height: none;
    padding: 0 12px;
    border: 0;
  }

  .privacy-link {
    text-align: left;
  }

  .logo {
    max-width: 100%;
    height: auto;
  }

</style>
