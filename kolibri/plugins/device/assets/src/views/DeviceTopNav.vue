<template>

  <Navbar>
    <div v-for="(link, index) in links" :key="index">
      <NavbarLink
        :vIf="link.condition"
        :title="link.title"
        :link="link.link"
      >
        <KIcon
          :icon="link.icon"
          :color="link.color"
        />
      </NavbarLink>
    </div>
    <span v-if="menuLinks.length > 0 && !windowIsLarge">
      <KIconButton
        class="menu-icon"
        :tooltip="coreString('moreOptions')"
        icon="optionsHorizontal"
        appearance="flat-button"
        :color="color"
        :primary="false"
      >
        <template #menu>
          <KDropdownMenu
            :primary="false"
            :hasIcons="true"
            :options="menuLinks"
            @select="handleSelect"
          />
        </template>
      </KIconButton>
    </span>
  </Navbar>

</template>


<script>

  import { mapGetters } from 'vuex';
  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'DeviceTopNav',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      numberOfNavigationTabsToDisplay: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        links: [
          {
            condition: this.canManageContent,
            title: this.coreString('channelsLabel'),
            link: this.$router.getRoute('MANAGE_CONTENT_PAGE'),
            icon: 'channel',
            color: this.$themeTokens.textInverted,
          },
          {
            condition: this.isSuperuser,
            title: this.$tr('permissionsLabel'),
            link: this.$router.getRoute('MANAGE_PERMISSIONS_PAGE'),
            icon: 'permissions',
            color: this.$themeTokens.textInverted,
          },
          {
            condition: this.isSuperuser,
            title: this.coreString('facilitiesLabel'),
            link: this.$router.getRoute('FACILITIES_PAGE'),
            icon: 'facility',
            color: this.$themeTokens.textInverted,
          },
          {
            condition: this.isSuperuser,
            title: this.$tr('infoLabel'),
            link: this.$router.getRoute('DEVICE_INFO_PAGE'),
            icon: 'deviceInfo',
            color: this.$themeTokens.textInverted,
          },
          {
            condition: this.isSuperuser,
            title: this.$tr('settingsLabel'),
            link: this.$router.getRoute('DEVICE_SETTINGS_PAGE'),
            icon: 'settings',
            color: this.$themeTokens.textInverted,
          },
        ],
      };
    },
    computed: {
      ...mapGetters(['canManageContent', 'isSuperuser']),

      menuLinks() {
        const limitedList = this.links.slice(
          this.numberOfNavigationTabsToDisplay,
          this.links.length
        );
        let options = [];
        limitedList.forEach(o => options.push({ label: o.title, value: o.link, icon: o.icon }));
        console.log(limitedList);
        return options;
        // return this.links.slice(this.numberOfNavigationTabsToDisplay, this.links.length);
      },
      color() {
        return this.$themeTokens.textInverted;
      },
    },
    methods: {
      handleSelect(option) {
        console.log('route', this.$router.getRoute(option.value.name));
        this.$router.push(this.$router.getRoute(option.value.name));
      },
    },
    $trs: {
      permissionsLabel: {
        message: 'Permissions',
        context: 'Refers to the Device > Permissions tab.',
      },
      infoLabel: {
        message: 'Info',
        context: 'Refers to the Device > Info tab.',
      },
      settingsLabel: {
        message: 'Settings',
        context: 'Refers to the Device > Settings tab.\n',
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

  .menu-popover {
    @extend %dropshadow-4dp;

    position: absolute;
    right: 4px;
    bottom: 50px;
    z-index: 24;
    font-size: 12px;
    background-color: white;
    border-radius: 8px;
  }

</style>
