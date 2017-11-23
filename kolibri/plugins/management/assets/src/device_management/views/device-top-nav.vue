<template>

  <k-navbar>
    <k-navbar-link
      v-if="canManageContent"
      type="icon-and-title"
      :title="$tr('contentLabel')"
      icon="apps"
      :link="linkify(PageNames.MANAGE_CONTENT_PAGE)"
    />
    <k-navbar-link
      v-if="isSuperuser"
      type="icon-and-title"
      :title="$tr('permissionsLabel')"
      icon="https"
      :link="linkify(PageNames.MANAGE_PERMISSIONS_PAGE)"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('infoLabel')"
      icon="perm_device_information"
      :link="linkify(PageNames.DEVICE_INFO_PAGE)"
    />
  </k-navbar>

</template>


<script>

  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  import { canManageContent, isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import { PageNames } from '../constants';

  export default {
    name: 'deviceManagementTopNav',
    components: {
      kNavbar,
      kNavbarLink,
    },
    computed: {
      PageNames: () => PageNames,
    },
    methods: {
      linkify(name) {
        return { name };
      },
    },
    vuex: {
      getters: {
        canManageContent,
        isSuperuser,
      },
    },
    $trs: {
      contentLabel: 'Content',
      permissionsLabel: 'Permissions',
      infoLabel: 'Info',
    },
  };

</script>


<style lang="stylus" scoped></style>
