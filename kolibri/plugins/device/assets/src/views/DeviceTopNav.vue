<template>

  <HorizontalNavBarWithOverflowMenu
    v-if="links.length > 0"
    :navigationLinks="links"
  />

</template>


<script>

  import { mapGetters } from 'vuex';
  import HorizontalNavBarWithOverflowMenu from 'kolibri.coreVue.components.HorizontalNavBarWithOverflowMenu';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonDeviceStrings from './commonDeviceStrings';

  export default {
    name: 'DeviceTopNav',
    components: {
      HorizontalNavBarWithOverflowMenu,
    },
    mixins: [commonCoreStrings, commonDeviceStrings],
    computed: {
      ...mapGetters(['canManageContent', 'isSuperuser', 'isLearnerOnlyImport']),
      links() {
        const list = [];
        const linkDefs = [
          {
            title: this.coreString('channelsLabel'),
            link: this.$router.getRoute('MANAGE_CONTENT_PAGE'),
            icon: 'channel',
            color: this.$themeTokens.text,
            condition: this.canManageContent,
          },
          {
            title: this.deviceString('permissionsLabel'),
            link: this.$router.getRoute('MANAGE_PERMISSIONS_PAGE'),
            icon: 'permissions',
            color: this.$themeTokens.text,
            condition: this.isSuperuser,
          },
          {
            title: this.coreString('facilitiesLabel'),
            link: this.$router.getRoute('FACILITIES_PAGE'),
            icon: 'facility',
            color: this.$themeTokens.text,
            condition: this.isSuperuser && !this.isLearnerOnlyImport,
          },
          {
            title: this.coreString('infoLabel'),
            link: this.$router.getRoute('DEVICE_INFO_PAGE'),
            icon: 'deviceInfo',
            color: this.$themeTokens.text,
            condition: this.isSuperuser,
          },
          {
            title: this.coreString('settingsLabel'),
            link: this.$router.getRoute('DEVICE_SETTINGS_PAGE'),
            icon: 'settings',
            color: this.$themeTokens.text,
            condition: this.isSuperuser,
          },
        ];
        linkDefs.forEach(linkDefs => {
          if (linkDefs.condition) {
            list.push(linkDefs);
          }
        });
        return list.flat();
      },
    },
  };

</script>
