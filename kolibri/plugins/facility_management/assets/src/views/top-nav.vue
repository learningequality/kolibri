<template>

  <k-navbar>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('classes')"
      :link="linkify(PageNames.CLASS_MGMT_PAGE)"
    >
      <mat-svg name="domain" category="social" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('users')"
      :link="linkify(PageNames.USER_MGMT_PAGE)"
    >
      <mat-svg name="people" category="social" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('settings')"
      :link="linkify(PageNames.FACILITY_CONFIG_PAGE)"
    >
      <mat-svg name="settings" category="action" />
    </k-navbar-link>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('data')"
      :link="linkify(PageNames.DATA_EXPORT_PAGE)"
    >
      <mat-svg name="save" category="content" />
    </k-navbar-link>
  </k-navbar>

</template>


<script>

  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  import { PageNames } from '../constants';

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
