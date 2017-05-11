<template>

  <tabs>
    <template slot="items">
      <tab-link
        :title="$tr('classes')"
        icon="domain"
        :link="classesLink"
        :selected="classesActive"
      />
      <tab-link
        :title="$tr('users')"
        icon="people"
        :link="usersLink"
        :selected="usersActive"
      />
      <tab-link
        :title="$tr('facilities')"
        icon="settings"
        :link="facilitiesConfigLink"
        :selected="facilitiesConfigActive"
      />
      <tab-link
        :title="$tr('data')"
        icon="save"
        :link="dataLink"
        :selected="dataActive"
      />
      <tab-link
        :title="$tr('content')"
        icon="view_module"
        :link="contentLink"
        :selected="contentActive"
      />
    </template>
  </tabs>

</template>


<script>

  const { PageNames } = require('../../constants');

  const linkify = (name) => ({ name });

  const classesSubPages = [
    PageNames.CLASS_EDIT_MGMT_PAGE,
    PageNames.CLASS_ENROLL_MGMT_PAGE,
    PageNames.CLASS_MGMT_PAGE,
  ];

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
      'tabs': require('kolibri.coreVue.components.tabs'),
      'tab-link': require('kolibri.coreVue.components.tabLink'),
    },
    computed: {
      classesLink() {
        return linkify(PageNames.CLASS_MGMT_PAGE);
      },
      classesActive() {
        return classesSubPages.includes(this.pageName);
      },
      facilitiesConfigLink() {
        return linkify(PageNames.FACILITY_CONFIG_PAGE);
      },
      facilitiesConfigActive() {
        return this.pageName === PageNames.FACILITY_CONFIG_PAGE;
      },
      usersLink() {
        return linkify(PageNames.USER_MGMT_PAGE);
      },
      usersActive() {
        return this.pageName === PageNames.USER_MGMT_PAGE;
      },
      dataLink() {
        return linkify(PageNames.DATA_EXPORT_PAGE);
      },
      dataActive() {
        return this.pageName === PageNames.DATA_EXPORT_PAGE;
      },
      contentLink() {
        return linkify(PageNames.CONTENT_MGMT_PAGE);
      },
      contentActive() {
        return this.pageName === PageNames.CONTENT_MGMT_PAGE;
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
