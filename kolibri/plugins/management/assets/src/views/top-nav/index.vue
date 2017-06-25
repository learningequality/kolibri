<template>

  <tabs>
    <tab-link
      type="icon-and-title"
      :title="$tr('classes')"
      icon="domain"
      :link="classesLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('users')"
      icon="people"
      :link="usersLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('facilities')"
      icon="settings"
      :link="facilitiesConfigLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('data')"
      icon="save"
      :link="dataLink"
    />
    <tab-link
      type="icon-and-title"
      :title="$tr('content')"
      icon="view_module"
      :link="contentLink"
    />
  </tabs>

</template>


<script>

  import { PageNames } from '../../constants';
  const linkify = name => ({ name });
  import tabs from 'kolibri.coreVue.components.tabs';
  import tabLink from 'kolibri.coreVue.components.tabLink';
  export default {
    $trNameSpace: 'topNav',
    $trs: {
      classes: 'Classes',
      content: 'Channels',
      data: 'Data',
      facilities: 'Facility',
      users: 'Users',
    },
    components: {
      tabs,
      tabLink,
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
