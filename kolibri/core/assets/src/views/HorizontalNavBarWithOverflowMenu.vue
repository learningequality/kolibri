<template>

  <Navbar>
    <div v-for="(link, index) in navigationLinks" :key="index" ref="navLinks">
      <NavbarLink
        :vIf="link.isVisible"
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
        class="menu-icon"
        :tooltip="coreString('moreOptions')"
        tooltipPosition="top"
        :ariaLabel="coreString('moreOptions')"
        icon="optionsHorizontal"
        appearance="flat-button"
        :color="color"
        :primary="false"
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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import debounce from 'lodash/debounce';

  export default {
    name: 'HorizontalNavBarWithOverflowMenu',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
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
      return {
        numberOfNavigationTabsToDisplay: 0,
        overflowMenuLinks: [],
      };
    },
    computed: {
      color() {
        return this.$themeTokens.textInverted;
      },
    },
    mounted() {
      this.updateNavigationTabDisplay();
      window.addEventListener('resize', this.updateNavigationTabDisplay);
    },
    beforeDestroy() {
      document.removeEventListener('resize', this.debouncedUpdateNavigation);
    },
    methods: {
      debouncedUpdateNavigation() {
        return debounce(this.updateNavigationTabDisplay, 1000);
      },
      handleSelect(option) {
        this.$router.push(this.$router.getRoute(option.value.name));
      },
      generateOverflowMenu() {
        const limitedList = this.navigationLinks.slice(
          this.numberOfNavigationTabsToDisplay,
          this.navigationLinks.length
        );
        let options = [];
        limitedList.forEach(o => options.push({ label: o.title, value: o.link, icon: o.icon }));
        this.overflowMenuLinks = options;
      },
      updateNavigationTabDisplay() {
        // to get the list item, rather than the wrapping <div>
        const navItems = this.$refs.navLinks.map(item => item.firstElementChild);
        let index = 0;
        let viewportWidthTakenUp = 0;
        let numberOfTabLinks = 0;
        if (navItems && navItems.length > 0) {
          while (index < navItems.length) {
            viewportWidthTakenUp = viewportWidthTakenUp + navItems[index].offsetWidth;
            if (viewportWidthTakenUp < window.innerWidth - 60) {
              navItems[index].classList.add('visible');
              numberOfTabLinks = index + 1;
            } else {
              navItems[index].classList.remove('visible');
            }
            index = index + 1;
          }
        }
        this.numberOfNavigationTabsToDisplay = numberOfTabLinks;
        this.generateOverflowMenu();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .menu-icon {
    position: absolute;
    right: 4px;
  }

</style>
