<template>

  <Navbar
    class="navbar-positioning"
  >
    <div
      ref="navContainer"
      class="navcontainer"
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
          :color="link.color"
        />
      </NavbarLink>
    </div>
    <span v-if="overflowMenuLinks && overflowMenuLinks.length > 0">
      <KIconButton
        :tooltip="coreString('moreOptions')"
        :style="{ left: computedWidth }"
        tooltipPosition="top"
        :ariaLabel="coreString('moreOptions')"
        icon="optionsHorizontal"
        appearance="flat-button"
        :color="color"
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
    </span>
  </Navbar>

</template>


<script>

  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useKResponsiveWindow from 'kolibri.coreVue.composables.useKResponsiveWindow';

  export default {
    name: 'HorizontalNavBarWithOverflowMenu',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { windowWidth } = useKResponsiveWindow();
      return {
        windowWidth,
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
      color() {
        return this.$themeTokens.textInverted;
      },
      computedWidth() {
        const childrenWidth = this.$refs.navContainer.children
          .slice(this.overflowMenuLinks.length)
          .reduce((totalWidth, child) => totalWidth + child.offsetWidth, 0);
        
        return `${childrenWidth + 16}px`;
      },
      overflowMenuLinks() {
        return (this.mounted && this.windowWidth
          ? this.allLinks.filter((link, index) => {
              const navLink = this.$refs.navLinks[index].$el;
              const navLinkTop = navLink.offsetTop;

              const containerTop = this.$refs.navContainer.offsetTop;
              const containerBottom = containerTop + this.$refs.navContainer.clientHeight;
              // Accounts for changes in container height that is not matched by height of buttons
              // as mobile styles are applied to the nav bar
              const heightDifference = Math.abs
                (this.$refs.navContainer.clientHeight - navLink.clientHeight);
              return (navLinkTop + heightDifference) >= containerBottom;
            })
          : []
        ).map(l => ({ label: l.title, value: l.link, icon: l.icon }));
      },
    },
    mounted() {
      this.mounted = true;
    },
    methods: {
      handleSelect(option) {
        this.$router.push(this.$router.getRoute(option.value.name));
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .navcontainer {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .kiconbutton-style {
    position: absolute;
    right: 1em;
  }

  .navbar-positioning {
    position: relative;
    padding-right: 3.5em;
  }

</style>
