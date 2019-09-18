<template>

  <Navbar>
    <NavbarLink
      v-if="canManageContent"
      :title="coreString('channelsLabel')"
      :link="$router.getRoute('MANAGE_CONTENT_PAGE')"
    >
      <mat-svg name="apps" category="navigation" />
    </NavbarLink>
    <NavbarLink
      v-if="isSuperuser"
      :title="$tr('permissionsLabel')"
      :link="$router.getRoute('MANAGE_PERMISSIONS_PAGE')"
    >
      <mat-svg name="https" category="action" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('infoLabel')"
      :link="$router.getRoute('DEVICE_INFO_PAGE')"
    >
      <mat-svg name="perm_device_information" category="action" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('settingsLabel')"
      :link="$router.getRoute('DEVICE_SETTINGS_PAGE')"
    >
      <mat-svg name="settings" category="action" />
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
