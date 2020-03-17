<template>

  <Navbar>
    <NavbarLink
      v-if="canManageContent"
      :title="coreString('channelsLabel')"
      :link="$router.getRoute('MANAGE_CONTENT_PAGE')"
    >
      <KIcon
        icon="channel"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </NavbarLink>
    <NavbarLink
      v-if="isSuperuser"
      :title="$tr('permissionsLabel')"
      :link="$router.getRoute('MANAGE_PERMISSIONS_PAGE')"
    >
      <KIcon
        icon="https"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </NavbarLink>
    <NavbarLink
      v-if="isSuperuser"
      :title="coreString('facilitiesLabel')"
      :link="$router.getRoute('FACILITIES_PAGE')"
    >
      <mat-svg name="business" category="communication" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('infoLabel')"
      :link="$router.getRoute('DEVICE_INFO_PAGE')"
    >
      <KIcon
        icon="perm_device_information"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </NavbarLink>
    <NavbarLink
      :title="$tr('settingsLabel')"
      :link="$router.getRoute('DEVICE_SETTINGS_PAGE')"
    >
      <KIcon
        icon="settings"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </NavbarLink>
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
    computed: {
      ...mapGetters(['canManageContent', 'isSuperuser']),
    },
    $trs: {
      permissionsLabel: 'Permissions',
      infoLabel: 'Info',
      settingsLabel: 'Settings',
    },
  };

</script>


<style lang="scss" scoped></style>
