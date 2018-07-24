<template>

  <KNavbar>
    <KNavbarLink
      v-if="canManageContent"
      type="icon-and-title"
      :title="$tr('contentLabel')"
      :link="linkify(PageNames.MANAGE_CONTENT_PAGE)"
    >
      <mat-svg name="apps" category="navigation" />
    </KNavbarLink>
    <KNavbarLink
      v-if="isSuperuser"
      type="icon-and-title"
      :title="$tr('permissionsLabel')"
      :link="linkify(PageNames.MANAGE_PERMISSIONS_PAGE)"
    >
      <mat-svg name="https" category="action" />
    </KNavbarLink>
    <KNavbarLink
      type="icon-and-title"
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
      contentLabel: 'Content',
      permissionsLabel: 'Permissions',
      infoLabel: 'Info',
    },
  };

</script>


<style lang="scss" scoped></style>
