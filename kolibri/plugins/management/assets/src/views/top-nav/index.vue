<template>

  <k-navbar>
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('classes')"
      icon="domain"
      :link="classesLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('users')"
      icon="people"
      :link="usersLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('facilities')"
      icon="settings"
      :link="facilitiesConfigLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('data')"
      icon="save"
      :link="dataLink"
    />
    <k-navbar-link
      type="icon-and-title"
      :title="$tr('content')"
      icon="view_module"
      :link="contentLink"
    />
  </k-navbar>

</template>


<script>

  import { PageNames } from '../../constants';
  const linkify = name => ({ name });
  import kNavbar from 'kolibri.coreVue.components.kNavbar';
  import kNavbarLink from 'kolibri.coreVue.components.kNavbarLink';
  export default {
    name: 'topNav',
    $trs: {
      classes: 'Classes',
      content: 'Channels',
      data: 'Data',
      facilities: 'Facility',
      users: 'Users',
    },
    components: {
      kNavbar,
      kNavbarLink,
    },
    computed: {
      classesLink() {
        return linkify(PageNames.CLASS_MGMT_PAGE);
      },
      facilitiesConfigLink() {
        return linkify(PageNames.FACILITY_CONFIG_PAGE);
      },
      usersLink() {
        return linkify(PageNames.USER_MGMT_PAGE);
      },
      dataLink() {
        return linkify(PageNames.DATA_EXPORT_PAGE);
      },
      contentLink() {
        return linkify(PageNames.CONTENT_MGMT_PAGE);
      },
    },
    vuex: { getters: { pageName: state => state.pageName } },
  };

</script>


<style lang="stylus" scoped></style>
