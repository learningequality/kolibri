<template>

  <k-navbar>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('classes')"
      icon="domain"
      :link="linkify(PageNames.CLASS_MGMT_PAGE)"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('users')"
      icon="people"
      :link="linkify(PageNames.USER_MGMT_PAGE)"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('settings')"
      icon="settings"
      :link="linkify(PageNames.FACILITY_CONFIG_PAGE)"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('data')"
      icon="save"
      :link="linkify(PageNames.DATA_EXPORT_PAGE)"
    />
  </k-navbar>

</template>


<script>

  import { PageNames } from '../../constants';
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  export default {
    name: 'topNav',
    $trs: {
      classes: 'Classes',
      data: 'Data',
      settings: 'Settings',
      users: 'Users',
    },
    components: {
      kNavbar,
      kNavbarLink,
    },
    computed: {
      PageNames: () => PageNames,
    },
    methods: {
      linkify: name => ({ name }),
    },
  };

</script>


<style lang="stylus" scoped></style>
