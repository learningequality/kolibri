<template>

  <HorizontalNavBarWithOverflowMenu
    :navigationLinks="links"
  />

</template>


<script>

  import HorizontalNavBarWithOverflowMenu from 'kolibri.coreVue.components.HorizontalNavBarWithOverflowMenu';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';

  export default {
    name: 'FacilityTopNav',
    components: {
      HorizontalNavBarWithOverflowMenu,
    },
    mixins: [commonCoreStrings],
    computed: {
      links() {
        return [
          {
            title: this.coreString('classesLabel'),
            link: this.$router.getRoute(PageNames.CLASS_MGMT_PAGE),
            icon: 'classes',
            color: this.$themeTokens.textInverted,
          },
          {
            title: this.coreString('usersLabel'),
            link: this.$router.getRoute(PageNames.USER_MGMT_PAGE),
            icon: 'people',
            color: this.$themeTokens.textInverted,
          },
          {
            title: this.coreString('settingsLabel'),
            link: this.$router.getRoute(PageNames.FACILITY_CONFIG_PAGE),
            icon: 'settings',
            color: this.$themeTokens.textInverted,
          },
          {
            title: this.coreString('dataLabel'),
            link: this.$router.getRoute(PageNames.DATA_EXPORT_PAGE),
            icon: 'save',
            color: this.$themeTokens.textInverted,
          },
        ];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
