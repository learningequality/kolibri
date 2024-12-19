<template>

  <nav class="navbar-positioning">
    <ul
      ref="items"
      class="items"
      tabindex="-1"
      :style="styleOverrides"
    >
      <NavbarLink
        v-for="(link, index) in allLinks"
        :key="index"
        ref="navLinks"
        :title="link.title"
        :link="link.link"
      >
        <KIcon
          :icon="link.icon"
          :color="themeConfig.appBar.textColor"
        />
      </NavbarLink>
    </ul>
    <KIconButton
      v-if="overflowMenuLinks && overflowMenuLinks.length > 0"
      :tooltip="coreString('moreOptions')"
      tooltipPosition="top"
      :ariaLabel="coreString('moreOptions')"
      icon="optionsHorizontal"
      appearance="flat-button"
      :color="themeConfig.appBar.textColor"
      :primary="false"
      class="kiconbutton-style"
    >
      <template #menu>
        <KDropdownMenu
          :primary="false"
          :disabled="false"
          :hasIcons="true"
          :options="overflowMenuLinks"
          @select="handleSelect"
        />
      </template>
    </KIconButton>
  </nav>

</template>


<script>

  import isUndefined from 'lodash/isUndefined';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import themeConfig from 'kolibri/styles/themeConfig';
  import NavbarLink from './NavbarLink';
  /**
   * Used for navigation between sub-pages of a top-level Kolibri section
   */
  export default {
    name: 'Navbar',
    components: {
      NavbarLink,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsLarge, windowIsMedium, windowWidth } = useKResponsiveWindow();
      return {
        windowIsLarge,
        windowIsMedium,
        windowWidth,
        themeConfig,
      };
    },
    props: {
      /**
       * An array of options objects, with one object per dropdown item
       */
      navigationLinks: {
        type: Array,
        default: () => [],
        required: true,
        validator(values) {
          return values.every(value => value.link.name);
        },
      },
    },
    data() {
      return { mounted: false };
    },
    computed: {
      allLinks() {
        return this.navigationLinks.filter(l => !l.isHidden);
      },
      overflowMenuLinks() {
        if (!this.mounted || isUndefined(this.windowWidth)) {
          return [];
        }
        const containerTop = this.$refs.items.offsetTop;
        const containerHeight = this.$refs.items.clientHeight;
        return this.allLinks
          .filter((link, index) => {
            const navLink = this.$refs.navLinks[index].$el;
            // Calculate navLinkTop relative to the items by subtracting the container's top
            const navLinkTop = navLink.offsetTop - containerTop;
            const navLinkHeight = navLink.clientHeight;
            const navLinkBottom = navLinkTop + navLinkHeight;
            // Check if the navLink is _not_ completely bounded the container, top and bottom.
            return !(navLinkTop >= 0 && navLinkBottom <= containerHeight);
          })
          .map(l => ({ label: l.title, value: l.link, icon: l.icon }));
      },
      styleOverrides() {
        const styles = { maxHeight: '52px' };
        if (this.windowIsLarge) {
          return styles;
        }
        styles.marginTop = 0;
        if (this.windowIsMedium) {
          return styles;
        }
        styles.maxHeight = '42px';
        return styles;
      },
    },
    mounted() {
      this.mounted = true;
    },
    methods: {
      handleSelect(option) {
        // Prevent redundant navigation
        if (this.$route.name === option.value.name) {
          return;
        }
        this.$router.push(this.$router.getRoute(option.value.name));
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .items {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0;
    margin-bottom: 4px;
    margin-left: 16px;
    overflow: hidden;
    white-space: nowrap;
  }

  .kiconbutton-style {
    flex-shrink: 0;
    float: right;
  }

  .navbar-positioning {
    position: relative;
    display: flex;
    align-items: center;
  }

</style>
