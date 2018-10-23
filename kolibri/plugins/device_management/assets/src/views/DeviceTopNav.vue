<template>

  <KNavbar>
    <KNavbarLink
      v-if="canManageContent"
      :title="$tr('channelsTabLabel')"
      :link="linkify(PageNames.MANAGE_CONTENT_PAGE)"
    >
      <mat-svg name="apps" category="navigation" />
    </KNavbarLink>
    <KNavbarLink
      v-if="isSuperuser"
      :title="$tr('permissionsLabel')"
      :link="linkify(PageNames.MANAGE_PERMISSIONS_PAGE)"
    >
      <mat-svg name="https" category="action" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('infoLabel')"
      :link="linkify(PageNames.DEVICE_INFO_PAGE)"
    >
      <mat-svg name="perm_device_information" category="action" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import { mapGetters } from 'vuex';
  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { PageNames } from '../constants';

  export default {
    name: 'DeviceTopNav',
    components: {
      KNavbar,
      KNavbarLink,
    },
    computed: {
      ...mapGetters(['canManageContent', 'isSuperuser']),
      PageNames: () => PageNames,
    },
    methods: {
      linkify(name) {
        return { name };
      },
    },
    $trs: {
      channelsTabLabel: 'Channels',
      permissionsLabel: 'Permissions',
      infoLabel: 'Info',
    },
  };

</script>


<style lang="scss" scoped></style>
