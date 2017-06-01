<template>

  <tabs scope="tab">
    <template scope="tab">
      <component
        :is="tab.link"
        :title="$tr('classes')"
        icon="domain"
        :link="classesLink"
      />
      <component
        :is="tab.link"
        :title="$tr('users')"
        icon="people"
        :link="usersLink"
      />
      <component
        :is="tab.link"
        :title="$tr('facilities')"
        icon="settings"
        :link="facilitiesConfigLink"
      />
      <component
        :is="tab.link"
        :title="$tr('data')"
        icon="save"
        :link="dataLink"
      />
      <component
        :is="tab.link"
        :title="$tr('content')"
        icon="view_module"
        :link="contentLink"
      />
    </template>
  </tabs>

</template>


<script>

  const { PageNames } = require('../../constants');

  const linkify = (name) => ({ name });

  module.exports = {
    $trNameSpace: 'topNav',
    $trs: {
      classes: 'Classes',
      content: 'Channels',
      data: 'Data',
      facilities: 'Facility',
      users: 'Users',
    },
    components: {
      tabs: require('kolibri.coreVue.components.tabs'),
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
    vuex: {
      getters: {
        pageName: state => state.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
