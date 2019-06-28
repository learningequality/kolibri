<template>

  <KNavbar>
    <KNavbarLink
      :title="coreString('classesLabel')"
      :link="linkify(PageNames.CLASS_MGMT_PAGE)"
    >
      <mat-svg name="domain" category="social" />
    </KNavbarLink>
    <KNavbarLink
      :title="coreString('usersLabel')"
      :link="linkify(PageNames.USER_MGMT_PAGE)"
    >
      <mat-svg name="people" category="social" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('settings')"
      :link="linkify(PageNames.FACILITY_CONFIG_PAGE)"
    >
      <mat-svg name="settings" category="action" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('data')"
      :link="linkify(PageNames.DATA_EXPORT_PAGE)"
    >
      <mat-svg name="save" category="content" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';

  export default {
    name: 'FacilityTopNav',
    components: {
      KNavbar,
      KNavbarLink,
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
