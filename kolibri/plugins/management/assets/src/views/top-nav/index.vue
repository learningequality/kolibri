<template>

  <div class="top">
    <div class="links">
      <router-link :to="classesLink" :class="{active: classesActive}" @click.native="blur">
        {{$tr('classes')}}
      </router-link>
      <router-link :to="usersLink" :class="{active: usersActive}" @click.native="blur">
        {{$tr('users')}}
      </router-link>
      <router-link :to="facilitiesConfigLink" :class="{active: facilitiesConfigActive}" @click.native="blur">
        {{$tr('facilities')}}
      </router-link>
      <router-link :to="dataLink" :class="{active: dataActive}" @click.native="blur">
        {{$tr('data')}}
      </router-link>
      <router-link :to="contentLink" :class="{active: contentActive}" @click.native="blur">
        {{$tr('content')}}
      </router-link>
    </div>
  </div>

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
      content: 'Content',
      data: 'Data',
      facilities: 'Facility',
      users: 'Users',
    },
    methods: {
      blur(evt) {
        evt.target.blur();
      },
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .top
    position: relative
    padding: 1em 2em
    background: $core-bg-light
    border-radius: $radius

  .top a
    padding: 0.6em 2em
    text-decoration: none
    color: $core-text-annotation
    display: inline-block

  .top .active
    color: $core-text-default
    cursor: default
    border-bottom: 0.3em $core-action-normal solid

</style>
