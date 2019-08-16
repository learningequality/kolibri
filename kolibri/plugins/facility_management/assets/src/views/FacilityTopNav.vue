<template>

  <Navbar>
    <NavbarLink
      :title="coreString('classesLabel')"
      :link="linkify(PageNames.CLASS_MGMT_PAGE)"
    >
      <mat-svg name="domain" category="social" />
    </NavbarLink>
    <NavbarLink
      :title="coreString('usersLabel')"
      :link="linkify(PageNames.USER_MGMT_PAGE)"
    >
      <mat-svg name="people" category="social" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('settings')"
      :link="linkify(PageNames.FACILITY_CONFIG_PAGE)"
    >
      <mat-svg name="settings" category="action" />
    </NavbarLink>
    <NavbarLink
      :title="$tr('data')"
      :link="linkify(PageNames.DATA_EXPORT_PAGE)"
    >
      <mat-svg name="save" category="content" />
    </NavbarLink>
  </Navbar>

</template>


<script>

  import Navbar from 'kolibri.coreVue.components.Navbar';
  import NavbarLink from 'kolibri.coreVue.components.NavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';

  export default {
    name: 'FacilityTopNav',
    components: {
      Navbar,
      NavbarLink,
    },
    mixins: [commonCoreStrings],
    computed: {
      PageNames: () => PageNames,
    },
    methods: {
      linkify: name => ({ name }),
    },
    $trs: {
      data: 'Data',
      settings: 'Settings',
    },
  };

</script>


<style lang="scss" scoped></style>
