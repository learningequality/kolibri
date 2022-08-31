<template>

  <HorizontalNavBarWithOverflowMenu
    :navigationLinks="links"
  />

</template>


<script>

  import { mapGetters } from 'vuex';
  import HorizontalNavBarWithOverflowMenu from 'kolibri.coreVue.components.HorizontalNavBarWithOverflowMenu';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'DeviceTopNav',
    components: {
      HorizontalNavBarWithOverflowMenu,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        links: [
          {
            isVisible: this.canManageContent,
            title: this.coreString('channelsLabel'),
            link: this.$router.getRoute('MANAGE_CONTENT_PAGE'),
            icon: 'channel',
            color: this.$themeTokens.textInverted,
          },
          {
            isVisible: this.isSuperuser,
            title: this.$tr('permissionsLabel'),
            link: this.$router.getRoute('MANAGE_PERMISSIONS_PAGE'),
            icon: 'permissions',
            color: this.$themeTokens.textInverted,
          },
          {
            isVisible: this.isSuperuser,
            title: this.coreString('facilitiesLabel'),
            link: this.$router.getRoute('FACILITIES_PAGE'),
            icon: 'facility',
            color: this.$themeTokens.textInverted,
          },
          {
            isVisible: this.isSuperuser,
            title: this.$tr('infoLabel'),
            link: this.$router.getRoute('DEVICE_INFO_PAGE'),
            icon: 'deviceInfo',
            color: this.$themeTokens.textInverted,
          },
          {
            isVisible: this.isSuperuser,
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
