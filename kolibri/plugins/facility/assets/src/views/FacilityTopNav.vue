<template>

  <Navbar>
    <NavbarLink
      :title="coreString('classesLabel')"
      :link="linkify(PageNames.CLASS_MGMT_PAGE)"
    >
      <KIcon icon="domain" :color="$themeTokens.textInverted" style="top: 0; width: 24px; height: 24px;" />
    </NavbarLink>
    <NavbarLink
      :title="coreString('usersLabel')"
      :link="linkify(PageNames.USER_MGMT_PAGE)"
    >
      <KIcon icon="people" :color="$themeTokens.textInverted" style="top: 0; width: 24px; height: 24px;" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('settings')"
      :link="linkify(PageNames.FACILITY_CONFIG_PAGE)"
    >
      <KIcon icon="settings" :color="$themeTokens.textInverted" style="top: 0; width: 24px; height: 24px;" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('data')"
      :link="linkify(PageNames.DATA_EXPORT_PAGE)"
    >
      <KIcon icon="save" :color="$themeTokens.textInverted" style="top: 0; width: 24px; height: 24px;" />
    </NavbarLink>
  </Navbar>

</template>


<script>

  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';

  export default {
    name: 'FacilityTopNav',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings],
    computed: {
      PageNames: () => PageNames,
    },
    methods: {
      linkify(name) {
        return {
          name,
          params: {
            facility_id: this.$route.params.facility_id,
          },
        };
      },
    },
    $trs: {
      data: 'Data',
      settings: 'Settings',
    },
  };

</script>


<style lang="scss" scoped></style>
