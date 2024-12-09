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

// General AppBar container styles
header {
  display: flex;
  align-items: center; // Ensures vertical alignment of all elements
  background-color: #f5f5f5; // Light gray background
  color: #000000; // Black text color
  padding: 0 16px; // Add padding for spacing
  height: 60px; // Set consistent height for the AppBar
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1); // Add subtle shadow
  border-bottom: 1px solid #ddd; // Optional: border for visual separation
}

// Navigation bar styles
.subpage-nav {
  display: flex;
  align-items: center; // Vertically align items
  gap: 24px; // Consistent spacing between items
  flex-grow: 1; // Ensure it expands to fill available space
  margin-left: 16px; // Add space after the logo
}

// Navigation link styles
.nav-link {
  display: flex;
  align-items: flex-end; // Align icons and text vertically
  gap: 8px; // Space between icons and text
  text-decoration: none;
  font-size: 16px;
  font-weight: 500; // Semi-bold for better readability
  color: #000000; // Black text color
  padding: 8px; // Add padding around each link
  border-radius: 4px; // Slight rounding for better visuals
  transition: background-color 0.3s; // Smooth hover effect
}

.nav-link:hover {
  background-color: #eeeeee; // Light gray hover background
}

.brand-logo {
  display: inline-block;
  max-width: 48px;
  max-height: 48px;
  margin-right: 8px; // Space between the logo and text
  vertical-align: middle; // Align with the text
}

// Username display styles
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

// Points popover styles
.points-popover {
  position: absolute;
  top: 50px;
  right: 16px;
  z-index: 10;
  background-color: #ffffff; // White background for popover
  color: #000000; // Black text color
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2); // Subtle shadow for popover
  font-size: 14px;
  line-height: 1.5;
}

// Points description
.points-description {
  font-size: 14px;
  font-weight: normal;
  color: #1976d2; // Blue color for points
  margin-left: 8px;
}

// Spacing for user menu button
.user-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: none;
  padding: 0 8px;
  cursor: pointer; // Make it clear it's clickable
}

// Responsive design for smaller screens
@media (max-width: 750px) {
    .username {
    max-width: 80px; // Smaller max width for narrow screens
    font-size: 14px; // Smaller font size for better fit
  }

  .nav-link {
    font-size: 14px; // Reduce font size for smaller screens
    padding: 6px; // Adjust padding for better fit
  }

  .points-description {
    display: none; // Hide points description on small screens
  }

  .subpage-nav {
    flex-wrap: wrap; // Allow navigation items to wrap for smaller screens
    justify-content: flex-start; // Align items to the left
  }
}

// Align and space elements in UiToolbar
/deep/ .ui-toolbar__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// Adjust spacing between left and right sections
/deep/ .ui-toolbar__left,
.ui-toolbar__right {
  display: flex;
  align-items: center;
  gap: 16px; // Add consistent spacing between elements
}
/deep/ .ui-toolbar__right {
    display: flex;
    align-items: center;
 }
// Style adjustments for KIconButton
/deep/ .k-icon-button {
  color: #000000; // Black icon color
  margin: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

// General text and spacing improvements
.text-normal {
  font-size: 16px;
  font-weight: normal;
  line-height: 1.4;
  color: #757575; // Secondary gray text color
}
</style>
