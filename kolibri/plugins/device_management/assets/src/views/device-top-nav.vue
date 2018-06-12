<template>

  <k-navbar>
    <k-navbar-link
      v-if="canManageContent"
      type="icon-and-title"
      :title="$tr('contentLabel')"
      :link="linkify(PageNames.MANAGE_CONTENT_PAGE)"
    >
      <mat-svg name="apps" category="navigation" />
    </k-navbar-link>
    <k-navbar-link
      v-if="isSuperuser"
      type="icon-and-title"
      :title="$tr('permissionsLabel')"
      :link="linkify(PageNames.MANAGE_PERMISSIONS_PAGE)"
    >
      <mat-svg name="https" category="action" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('infoLabel')"
      :link="linkify(PageNames.DEVICE_INFO_PAGE)"
    >
      <mat-svg name="perm_device_information" category="action" />
    </k-navbar-link>
  </k-navbar>

</template>


<script>

  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  import { canManageContent, isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import { PageNames } from '../constants';

  export default {
    name: 'deviceTopNav',
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
