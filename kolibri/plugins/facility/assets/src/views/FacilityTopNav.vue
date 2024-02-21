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
        const facility_id = this.$route.params.facility_id;

        return [
          {
            title: this.coreString('classesLabel'),
            link: this.$router.getRoute(PageNames.CLASS_MGMT_PAGE, { facility_id }),
            icon: 'classes',
            color: this.$themeTokens.text,
          },
          {
            title: this.coreString('usersLabel'),
            link: this.$router.getRoute(PageNames.USER_MGMT_PAGE, { facility_id }),
            icon: 'people',
            color: this.$themeTokens.text,
          },
          {
            title: this.coreString('settingsLabel'),
            link: this.$router.getRoute(PageNames.FACILITY_CONFIG_PAGE, { facility_id }),
            icon: 'settings',
            color: this.$themeTokens.text,
          },
          {
            title: this.coreString('dataLabel'),
            link: this.$router.getRoute(PageNames.DATA_EXPORT_PAGE, { facility_id }),
            icon: 'save',
            color: this.$themeTokens.text,
          },
        ];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
