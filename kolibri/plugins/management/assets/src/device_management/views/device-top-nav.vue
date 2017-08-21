<template>

  <k-navbar>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('contentLabel')"
      icon="view_module"
      :link="linkify(PageNames.DEVICE_CONTENT_MGMT_PAGE)"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('permissionsLabel')"
      icon="lock_outline"
      :link="linkify(PageNames.DEVICE_PERMISSIONS_MGMT_PAGE)"
    />
  </k-navbar>

</template>


<script>

  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
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
      }
    },
    vuex: {
      getters: {

      },
      actions: {

      },
    },
    $trs: {
      contentLabel: 'Content',
      permissionsLabel: 'Permissions',
    }
  }

</script>


<style lang="stylus" scoped>

</style>
