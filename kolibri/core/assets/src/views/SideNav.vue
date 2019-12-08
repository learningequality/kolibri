<template>

  <div ref="sideNav" class="side-nav-wrapper" @keyup.esc="toggleNav">
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
        <div
          class="side-nav-header"
          :style="{
            height: headerHeight + 'px',
            width: `${width}px`, paddingTop: windowIsSmall ? '4px' : '8px',
            backgroundColor: $themeTokens.primary,
          }"
        >
          <UiIconButton
            ref="toggleButton"
            :aria-label="$tr('closeNav')"
            type="secondary"
            color="white"
            size="large"
            class="side-nav-header-icon"
            @click="toggleNav"
          >
            <mat-svg
              name="close"
              category="navigation"
              :style="{fill: $themeTokens.textInverted}"
            />
          </UiIconButton>
          <span
            class="side-nav-header-name"
            :style="{ color: $themeTokens.textInverted }"
          >{{ sideNavTitleText }}</span>
        </div>

        <div
          class="side-nav-scrollable-area"
          :style="{ top: `${headerHeight}px`, width: `${width}px` }"
        >
          <img
            v-if="$kolibriBranding.sideNav.topLogo"
            class="logo"
            :src="$kolibriBranding.sideNav.topLogo.src"
            :alt="$kolibriBranding.sideNav.topLogo.alt"
            :style="$kolibriBranding.sideNav.topLogo.style"
          >
          <CoreMenu
            role="navigation"
            :style="{ backgroundColor: $themeTokens.surface }"
            :aria-label="$tr('navigationLabel')"
          >
            <template slot="options">
              <component :is="component" v-for="component in menuOptions" :key="component.name" />
              <SideNavDivider />
            </template>
          </CoreMenu>

          <div class="side-nav-scrollable-area-footer" :style="{ color: $themeTokens.annotation }">
            <!-- custom branded footer logo + text -->
            <template v-if="$kolibriBranding.sideNav.brandedFooter">
              <img
                v-if="$kolibriBranding.sideNav.brandedFooter.logo"
                class="side-nav-scrollable-area-footer-logo"
                :src="$kolibriBranding.sideNav.brandedFooter.logo.src"
                :alt="$kolibriBranding.sideNav.brandedFooter.logo.alt"
                :style="$kolibriBranding.sideNav.brandedFooter.logo.style"
              >
              <div
                v-if="$kolibriBranding.sideNav.brandedFooter.paragraphArray
                  && $kolibriBranding.sideNav.brandedFooter.paragraphArray.length"
                class="side-nav-scrollable-area-footer-info"
              >
                <p
                  v-for="(line, index) in $kolibriBranding.sideNav.brandedFooter.paragraphArray"
                  :key="index"
                >
                  {{ line }}
                </p>
              </div>
            </template>
            <!-- Kolibri footer logo -->
            <CoreLogo
              v-if="$kolibriBranding.sideNav.showKolibriFooterLogo"
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

      </div>
    </transition>

    <div
      v-show="navShown"
      class="side-nav-backdrop"
      @click="toggleNav"
    >
    </div>

    <PrivacyInfoModal
      v-if="privacyModalVisible"
      @cancel="privacyModalVisible = false"
      @submit="privacyModalVisible = false"
    />

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import navComponents from 'kolibri.utils.navComponents';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import branding from 'kolibri.utils.branding';
  import navComponentsMixin from '../mixins/nav-components';
  import logout from './LogoutSideNavEntry';
  import SideNavDivider from './SideNavDivider';

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
      CoreMenu,
      UiIconButton,
      CoreLogo,
      SideNavDivider,
      PrivacyInfoModal,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin, responsiveElementMixin, navComponentsMixin],
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
        previouslyFocusedElement: null,
        // __copyrightYear is injected by Webpack DefinePlugin
        copyrightYear: __copyrightYear,
        privacyModalVisible: false,
      };
    },
    computed: {
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
        if (this.$kolibriBranding.sideNav.title) {
          return this.$kolibriBranding.sideNav.title;
        }
        return this.coreString('kolibriLabel');
      },
    },
    watch: {
      navShown(isShown) {
        this.$nextTick(() => {
          if (isShown) {
            window.addEventListener('focus', this.containFocus, true);
            this.previouslyFocusedElement = document.activeElement;
            this.$refs.sideNav.focus();
          } else {
            window.removeEventListener('focus', this.containFocus, true);
            this.previouslyFocusedElement.focus();
          }
        });
      },
    },
    created() {
      this.$kolibriBranding = branding;
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
      containFocus(event) {
        if (event.target === window) {
          return event;
        }
        if (!this.$refs.sideNav.contains(event.target)) {
          this.$refs.toggleButton.$el.focus();
        }
        return event;
      },
    },
    $trs: {
      navigationLabel: 'Main user navigation',
      closeNav: 'Close navigation',
      poweredBy: 'Kolibri {version}',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

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
    padding-top: 8px;
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
    position: fixed;
    top: 0;
    left: 0;
    z-index: 15;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    background-attachment: fixed;
    transition: opacity 0.3s ease;
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
