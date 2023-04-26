<template>

  <div
    ref="sideNav"
    class="side-nav-wrapper"
    tabindex="0"
    @keyup.esc="toggleNav"
  >
    <transition :name="isAppContext ? 'bottom-nav' : 'side-nav'">
      <div
        v-show="navShown"
        class="side-nav"
        :class="isAppContext ? 'bottom-offset' : ''"
        :style="{
          width: `${width}`,
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
        }"
      >


        <FocusTrap
          @shouldFocusFirstEl="$emit('shouldFocusFirstEl')"
          @shouldFocusLastEl="focusLastEl"
        >


          <div
            :class="isAppContext ? 'bottom-nav-scrollable-area' : 'side-nav-scrollable-area'"
            :style="isAppContext ?
              { width: `${width}` } :
              { top: `${topBarHeight}px`, width: `${width}` }"
          >
            <img
              v-if="themeConfig.sideNav.topLogo"
              class="logo"
              :src="themeConfig.sideNav.topLogo.src"
              :alt="themeConfig.sideNav.topLogo.alt"
              :style="themeConfig.sideNav.topLogo.style"
            >


            <div v-if="userIsLearner || isAppContext" class="user-information">
              <div v-if="isAppContext" style="margin-bottom:10px;margin-left:-15px">
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
                  marginBottom: 0
                }"
              >
                {{ username }}
              </p>
              <p :style="{ color: $themeTokens.annotation, fontSize: '12px', marginTop: 0 }">
                {{ loggedInUserKind }}
              </p>


              <!-- display sync status, when relevant -->
              <div v-if="isLearnerOnlyImport" data-test="syncStatusInDropdown">
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
            <SideNavDivider v-if="userIsLearner" :style="{ listStyleType: 'none' }" />
            <CoreMenu
              ref="coreMenu"
              role="navigation"
              :style="{ backgroundColor: $themeTokens.surface, width: width }"
              :aria-label="$tr('navigationLabel')"
            >
              <template #options>
                <CoreMenuOption
                  v-for="component in topComponents"
                  :key="component.name"
                  :label="component.label"
                  :subRoutes="component.routes"
                  :link="component.url"
                  :icon="component.icon"
                  data-test="side-nav-component"
                />
                <SideNavDivider />
                <CoreMenuOption
                  v-for="component in accountComponents"
                  :key="component.name"
                  :label="component.label"
                  :subRoutes="component.routes"
                  :link="component.url"
                  :icon="component.icon"
                  data-test="side-nav-component"
                />
                <LogoutSideNavEntry v-if="showLogout" />
                <CoreMenuOption
                  :label="coreString('changeLanguageOption')"
                  icon="language"
                  class="pointer"
                  @select="handleShowLanguageModal()"
                />
                <SideNavDivider />
              </template>
            </CoreMenu>

            <div v-if="showSoudNotice" style="padding: 16px">
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
                  v-if="themeConfig.sideNav.brandedFooter.paragraphArray
                    && themeConfig.sideNav.brandedFooter.paragraphArray.length"
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
            v-if="!isAppContext"
            class="side-nav-header"
            :style="{
              height: topBarHeight + 'px',
              width: `${width}`, paddingTop: windowIsSmall ? '4px' : '8px',
              backgroundColor: $themeTokens.appBar,
            }"
          >
            <KIconButton
              ref="closeButton"
              tabindex="0"
              icon="close"
              :color="$themeTokens.textInverted"
              class="side-nav-header-icon"
              :ariaLabel="$tr('closeNav')"
              size="large"
              @click="toggleNav"
            />
            <span
              class="side-nav-header-name"
              :style="{ color: $themeTokens.textInverted }"
            >{{ sideNavTitleText }}</span>
          </div>
        </FocusTrap>
      </div>
    </transition>

    <BottomNavigationBar
      v-if="isAppContext"
      :bottomMenuOptions="bottomMenuOptions"
      :navShown="navShown"
      @toggleNav="toggleNav()"
    />



    <Backdrop
      v-show="navShown && !isAppContext"
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

  import { mapGetters, mapState } from 'vuex';
  import { get } from '@vueuse/core';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreMenuOption from 'kolibri.coreVue.components.CoreMenuOption';
  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import LearnOnlyDeviceNotice from 'kolibri.coreVue.components.LearnOnlyDeviceNotice';
  import navComponents from 'kolibri.utils.navComponents';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import themeConfig from 'kolibri.themeConfig';
  import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import TotalPoints from 'kolibri.coreVue.components.TotalPoints';
  import navComponentsMixin from '../mixins/nav-components';
  import useUser from '../composables/useUser';
  import useUserSyncStatus from '../composables/useUserSyncStatus';
  import SyncStatusDisplay from './SyncStatusDisplay';
  import SideNavDivider from './SideNavDivider';
  import FocusTrap from './FocusTrap.vue';
  import BottomNavigationBar from './BottomNavigationBar';
  import LogoutSideNavEntry from './LogoutSideNavEntry';

  // Explicit ordered list of roles for nav item sorting
  const navComponentRoleOrder = [
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
      FocusTrap,
      TotalPoints,
      LanguageSwitcherModal,
      LogoutSideNavEntry,
      BottomNavigationBar,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin, responsiveElementMixin, navComponentsMixin],
    setup() {
      let userSyncStatus = null;
      let userLastSynced = null;
      const { isLearnerOnlyImport } = useUser();
      if (get(isLearnerOnlyImport)) {
        const { status, lastSynced } = useUserSyncStatus();
        userSyncStatus = status;
        userLastSynced = lastSynced;
      }
      return { isLearnerOnlyImport, themeConfig, userSyncStatus, userLastSynced };
    },
    props: {
      navShown: {
        type: Boolean,
        required: true,
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
      ...mapGetters(['isSuperuser', 'isAdmin', 'isCoach', 'getUserKind', 'isAppContext']),
      ...mapState({
        username: state => state.core.session.username,
        fullName: state => state.core.session.full_name,
      }),
      width() {
        return this.isAppContext ? '100vw' : `${this.topBarHeight * 4.5}px`;
      },
      showSoudNotice() {
        return this.isLearnerOnlyImport && (this.isSuperuser || this.isAdmin || this.isCoach);
      },
      footerMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      topComponents() {
        return navComponents
          .filter(component => component.section !== NavComponentSections.ACCOUNT)
          .sort(this.compareMenuComponents)
          .filter(this.filterByRole)
          .filter(this.filterByFullFacilityOnly);
      },
      accountComponents() {
        const accountComponents = navComponents
          .filter(component => component.section === NavComponentSections.ACCOUNT)
          .sort(this.compareMenuComponents);

        return [...accountComponents]
          .filter(this.filterByRole)
          .filter(this.filterByFullFacilityOnly);
      },
      showLogout() {
        return this.getUserKind !== UserKinds.ANONYMOUS;
      },
      bottomMenuOptions() {
        return navComponents.filter(component => component.bottomBar == true);
      },
      sideNavTitleText() {
        if (this.themeConfig.sideNav.title) {
          return this.themeConfig.sideNav.title;
        }
        return this.coreString('kolibriLabel');
      },
      userIsLearner() {
        return this.getUserKind == UserKinds.LEARNER;
      },
      loggedInUserKind() {
        if (this.getUserKind === UserKinds.LEARNER) {
          return this.coreString('learnerLabel');
        }
        if (this.getUserKind === UserKinds.ADMIN) {
          return this.coreString('adminLabel');
        }
        if (this.getUserKind === UserKinds.COACH) {
          return this.coreString('coachLabel');
        }
        return this.coreString('superAdminLabel');
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
      toggleNav() {
        this.$emit('toggleSideNav');
      },
      handleShowLanguageModal() {
        this.languageModalShown = true;
      },
      handleClickPrivacyLink() {
        this.privacyModalVisible = true;
      },
      compareMenuComponents(navComponentA, navComponentB) {
        // Compare menu items to allow sorting by the following priority:
        // Sort by role
        // Nav items with no roles will be placed first
        // as index will be -1
        if (navComponentA.role !== navComponentB.role) {
          return (
            navComponentRoleOrder.indexOf(navComponentA.role) -
            navComponentRoleOrder.indexOf(navComponentB.role)
          );
        }
        // Next sort by priority
        if (navComponentA.priority !== navComponentB.priority) {
          return navComponentA.priority - navComponentB.priority;
        }
        // Still no difference?
        // There is no difference!
        return 0;
      },
      filterByFullFacilityOnly(component) {
        return !this.isLearnerOnlyImport || !component.fullFacilityOnly;
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
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  // Matches the Keen-UI/UiToolbar box-shadow property
  %ui-toolbar-box-shadow {
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.12), 0 2px 2px rgba(0, 0, 0, 0.2);
  }

  .side-nav-wrapper {
    overflow-x: hidden;
  }

  .side-nav {
    @extend %dropshadow-16dp;

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
    @extend %ui-toolbar-box-shadow;

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
