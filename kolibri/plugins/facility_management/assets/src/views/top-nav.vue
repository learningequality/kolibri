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

  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { PageNames } from '../constants';

  export default {
    name: 'TopNav',
    $trs: {
      classes: 'Classes',
      data: 'Data',
      settings: 'Settings',
      users: 'Users',
    },
    components: {
      KNavbar,
      KNavbarLink,
    },
    computed: {
      PageNames: () => PageNames,
    },
    methods: {
      linkify: name => ({ name }),
    },
  };

</script>


<style lang="scss" scoped></style>
