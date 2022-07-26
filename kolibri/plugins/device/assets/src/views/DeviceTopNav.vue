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
    <span v-if="menuLinks.length > 0">
      <KIconButton
        icon="optionsVertical"
        :color="color"
        class="menu-icon"
        @click="menuDisplayed = !menuDisplayed"
      />
      <div
        v-if="menuDisplayed"
        class="menu-overflow"
        :style="{
          color: $themeTokens.text,
          padding: '8px',
        }"
      >
        <div v-for="(link, index) in menuLinks" :key="index">
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
      </div>
    </span>
  </Navbar>

</template>


<script>

  import { mapGetters } from 'vuex';
  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeviceTopNav',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings],
    props: {
      numberOfNavigationTabsToDisplay: {
        type: Number,
        default: 0,
      },
    },
    data() {
      return {
        menuDisplayed: false,
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
        console.log(
          'menuLinks',
          this.links.slice(this.numberOfNavigationTabsToDisplay, this.links.length)
        );
        return this.links.slice(this.numberOfNavigationTabsToDisplay, this.links.length);
      },
      color() {
        return this.$themeTokens.textInverted;
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
    opacity: 0.6;
  }

  .menu-popover {
    @extend %dropshadow-4dp;

    position: absolute;
    right: 50px;
    z-index: 24;
    font-size: 12px;
    background-color: white;
    border-radius: 8px;
  }

</style>
