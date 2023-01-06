<template>

  <div
    ref="sideNav"
    class="side-nav-wrapper"
    tabindex="0"
    @keyup.esc="toggleNav"
  >
    <transition name="side-nav">
      <div
        v-show="navShown"
        class="side-nav"
        :style="{
          width: `${width}px`,
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
        }"
      >
        <FocusTrap
          @shouldFocusFirstEl="$emit('shouldFocusFirstEl')"
          @shouldFocusLastEl="focusLastEl"
        >


          <div
            class="side-nav-scrollable-area"
            :style="{ top: `${headerHeight}px`, width: `${width}px` }"
          >
            <img
              v-if="themeConfig.sideNav.topLogo"
              class="logo"
              :src="themeConfig.sideNav.topLogo.src"
              :alt="themeConfig.sideNav.topLogo.alt"
              :style="themeConfig.sideNav.topLogo.style"
            >
            <CoreMenu
              ref="coreMenu"
              role="navigation"
              :style="{ backgroundColor: $themeTokens.surface }"
              :aria-label="$tr('navigationLabel')"
            >
              <template #options>
                <component :is="component" v-for="component in menuOptions" :key="component.name" />
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
            class="side-nav-header"
            :style="{
              height: headerHeight + 'px',
              width: `${width}px`, paddingTop: windowIsSmall ? '4px' : '8px',
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

    <Backdrop
      v-show="navShown"
      :transitions="true"
      class="side-nav-backdrop"
      @click="toggleNav"
    />

    <PrivacyInfoModal
      v-if="privacyModalVisible"
      @cancel="privacyModalVisible = false"
      @submit="privacyModalVisible = false"
    />

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import LearnOnlyDeviceNotice from 'kolibri.coreVue.components.LearnOnlyDeviceNotice';
  import navComponents from 'kolibri.utils.navComponents';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import themeConfig from 'kolibri.themeConfig';
  import Backdrop from 'kolibri.coreVue.components.Backdrop';
  import navComponentsMixin from '../mixins/nav-components';
  import logout from './LogoutSideNavEntry';
  import SideNavDivider from './SideNavDivider';
  import FocusTrap from './FocusTrap.vue';
  import plugin_data from 'plugin_data';

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
      CoreLogo,
      LearnOnlyDeviceNotice,
      SideNavDivider,
      PrivacyInfoModal,
      FocusTrap,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin, responsiveElementMixin, navComponentsMixin],
    setup() {
      return { themeConfig };
    },
    props: {
      navShown: {
        type: Boolean,
        required: true,
      },
      headerHeight: {
        type: Number,
        required: true,
      },
      width: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        // __copyrightYear is injected by Webpack DefinePlugin
        copyrightYear: __copyrightYear,
        privacyModalVisible: false,
        isSubsetOfUsersDevice: plugin_data.isSubsetOfUsersDevice,
      };
    },
    computed: {
      ...mapGetters(['isAdmin', 'isCoach']),
      showSoudNotice() {
        return this.isSubsetOfUsersDevice && (this.isAdmin || this.isCoach);
      },
      footerMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      menuOptions() {
        const topComponents = navComponents
          .filter(component => component.section !== NavComponentSections.ACCOUNT)
          .sort(this.compareMenuComponents);
        const accountComponents = navComponents
          .filter(component => component.section === NavComponentSections.ACCOUNT)
          .sort(this.compareMenuComponents);
        return [...topComponents, SideNavDivider, ...accountComponents, logout].filter(
          this.filterByRole
        );
      },
      sideNavTitleText() {
        if (this.themeConfig.sideNav.title) {
          return this.themeConfig.sideNav.title;
        }
        return this.coreString('kolibriLabel');
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
    methods: {
      toggleNav() {
        this.$emit('toggleSideNav');
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
        message: 'Main user navigation',
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
  }

  .side-nav-scrollable-area-footer {
    padding: 16px;
  }

  .side-nav-scrollable-area-footer-logo {
    max-width: 100%;
    height: 77px;
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
    max-height: none;
    padding: 0;
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
