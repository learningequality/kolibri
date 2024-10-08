<template>

  <div
    v-show="!$isPrint"
    :style="{ backgroundColor: $themeTokens.appBar }"
  >
    <header>
      <SkipNavigationLink />

      <UiToolbar
        :removeNavIcon="showAppNavView"
        type="clear"
        textColor="black"
        class="app-bar"
        :style="{ height: topBarHeight + 'px' }"
        :raised="false"
        :removeBrandDivider="true"
      >
        <KTextTruncator
          :text="windowIsSmall ? truncateText(title, 20) : truncateText(title, 50)"
          :maxLines="1"
        />
        <template
          v-if="!showAppNavView"
          #icon
        >
          <KIconButton
            icon="menu"
            :color="$themeTokens.text"
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
            :class="showAppNavView ? 'brand-logo-left' : 'brand-logo'"
          >
        </template>

        <template
          v-if="showNavigation && windowIsLarge"
          #navigation
        >
          <slot name="sub-nav">
            <Navbar
              v-if="links.length > 0"
              :navigationLinks="links"
            />
          </slot>
        </template>

        <template #actions>
          <div
            aria-live="polite"
            :style="{
              paddingBottom: '6px',
            }"
          >
            <slot name="app-bar-actions"></slot>
            <span v-if="isLearner">
              <KIcon
                ref="pointsButton"
                icon="pointsActive"
                :ariaLabel="$tr('pointsAriaLabel')"
                :color="$themeTokens.primary"
              />
              <div
                v-if="!windowIsSmall"
                class="points-description"
              >
                {{ $formatNumber(totalPoints) }}
              </div>
              <div
                v-if="pointsDisplayed"
                class="points-popover"
                :style="{
                  color: $themeTokens.text,
                  padding: '8px',
                  backgroundColor: $themeTokens.surface,
                }"
              >
                {{ $tr('pointsMessage', { points: totalPoints }) }}
              </div>
            </span>
            <span
              v-if="isUserLoggedIn"
              tabindex="-1"
            >
              <KIcon
                icon="person"
                :style="{
                  fill: $themeTokens.text,
                  height: '24px',
                  width: '24px',
                  margin: '4px',
                  top: '8px',
                }"
              />
              <span class="username">
                {{ usernameForDisplay }}
              </span>
            </span>
          </div>
        </template>
      </UiToolbar>
    </header>
    <div
      v-if="showNavigation && !windowIsLarge && !showAppNavView"
      class="subpage-nav"
    >
      <slot name="sub-nav">
        <Navbar
          v-if="links.length > 0"
          :navigationLinks="links"
        />
      </slot>
    </div>
  </div>

</template>


<script>

  import { get } from '@vueuse/core';
  import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import KIconButton from 'kolibri-design-system/lib/buttons-and-links/KIconButton';
  import themeConfig from 'kolibri.themeConfig';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useTotalProgress from 'kolibri.coreVue.composables.useTotalProgress';
  import useNav from '../composables/useNav';
  import useUser from '../composables/useUser';
  import SkipNavigationLink from './SkipNavigationLink';
  import Navbar from './Navbar';

  const hashedValuePattern = /^[a-f0-9]{30}$/;

  export default {
    name: 'AppBar',
    components: {
      UiToolbar,
      KIconButton,
      SkipNavigationLink,
      Navbar,
    },
    mixins: [commonCoreStrings],
    setup() {
      const store = getCurrentInstance().proxy.$store;
      const $route = computed(() => store.state.route);
      const { windowIsLarge, windowIsSmall } = useKResponsiveWindow();
      const { topBarHeight, navItems } = useNav();
      const { isLearner, isUserLoggedIn, username, full_name } = useUser();
      const { totalPoints, fetchPoints } = useTotalProgress();
      const links = computed(() => {
        const currentItem = get(navItems).find(nc => nc.url === window.location.pathname);
        if (!currentItem || !currentItem.routes) {
          return [];
        }
        return currentItem.routes.map(route => ({
          title: route.label,
          link: { name: route.name, params: get($route).params, query: get($route).query },
          icon: route.icon,
          condition: route.condition,
        }));
      });
      return {
        themeConfig,
        windowIsLarge,
        windowIsSmall,
        topBarHeight,
        links,
        isUserLoggedIn,
        isLearner,
        username,
        fullName: full_name,
        totalPoints,
        fetchPoints,
      };
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      showNavigation: {
        type: Boolean,
        default: true,
      },
      showAppNavView: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        pointsDisplayed: false,
      };
    },
    computed: {
      // temp hack for the VF plugin
      usernameForDisplay() {
        return !hashedValuePattern.test(this.username) ? this.username : this.fullName;
      },
    },
    created() {
      if (this.isLearner) {
        this.fetchPoints();
      }
      window.addEventListener('click', this.handleWindowClick);
      window.addEventListener('keydown', this.handlePopoverByKeyboard, true);
    },
    beforeDestroy() {
      window.removeEventListener('click', this.handleWindowClick);
      window.removeEventListener('keydown', this.handlePopoverByKeyboard, true);
    },
    methods: {
      handleWindowClick(event) {
        if (this.$refs.pointsButton && this.$refs.pointsButton.$el) {
          if (!this.$refs.pointsButton.$el.contains(event.target) && this.pointsDisplayed) {
            this.pointsDisplayed = false;
          } else if (
            this.$refs.pointsButton &&
            this.$refs.pointsButton.$el &&
            this.$refs.pointsButton.$el.contains(event.target)
          ) {
            this.pointsDisplayed = !this.pointsDisplayed;
          }
        }
        return event;
      },
      handlePopoverByKeyboard(event) {
        if ((event.key == 'Tab' || event.key == 'Escape') && this.pointsDisplayed) {
          this.pointsDisplayed = false;
        }
      },
      truncateText(value, maxLength) {
        if (value && value.length > maxLength) {
          return value.substring(0, maxLength) + '...';
        }
        return value;
      },
    },
    $trs: {
      openNav: {
        message: 'Open site navigation',
        context:
          "This message is providing additional context to the screen-reader users, but is not visible in the Kolibri UI.\n\nIn this case the screen-reader will announce the message when user navigates to the 'hamburger' button with the keyboard, to indicate that it allows them to open the sidebar navigation menu.",
      },
      pointsMessage: {
        message: 'You earned { points, number } points',
        context: 'Notification indicating how many points a leaner has earned.',
      },
      pointsAriaLabel: {
        message: 'Points earned',
        context:
          'Information for screen reader users about what information they will get by clicking a button',
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
    position: relative;
    bottom: 3px;
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

  /deep/ .ui-toolbar__right {
    display: flex;
    align-items: center;
  }

  /deep/ .ui-toolbar__left {
    display: flex;
    align-items: center;
    margin-left: 8px;
  }

  .brand-logo {
    max-width: 48px;
    max-height: 48px;
    margin-right: 8px;
    vertical-align: middle;
  }

  .brand-logo-left {
    margin-left: -16px !important;
  }

  // Hide the UiButton focus ring
  /deep/ .ui-button__focus-ring {
    display: none;
  }

  .points-popover {
    @extend %dropshadow-4dp;

    position: absolute;
    right: 50px;
    z-index: 24;
    font-size: 12px;
    border-radius: 8px;
  }

  .points-description {
    display: inline-block;
    margin-left: 8px;
    font-size: 14px;
  }

</style>
