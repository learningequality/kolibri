<template>

  <div class="top">
    <div class="links">
      <router-link :to="classesLink" :class="{active: classesActive}" @click.native="blur">
        {{$tr('classes')}}
      </router-link>
      <router-link :to="usersLink" :class="{active: usersActive}" @click.native="blur">
        {{$tr('users')}}
      </router-link>
      <router-link :to="dataLink" :class="{active: dataActive}" @click.native="blur">
        {{$tr('data')}}
      </router-link>
      <router-link :to="contentLink" :class="{active: contentActive}" @click.native="blur" v-if="isDeviceOwner">
        {{$tr('content')}}
      </router-link>
    </div>
  </div>

</template>


<script>

  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;
  const constants = require('../../state/constants');

  module.exports = {
    $trNameSpace: 'top-nav',
    $trs: {
      classes: 'Classes',
      users: 'Users',
      content: 'Content',
      data: 'Data',
    },
    methods: {
      blur(evt) {
        evt.target.blur();
      },
    },
    computed: {
      classesLink() {
        return { name: constants.PageNames.CLASS_MGMT_PAGE };
      },
      classesActive() {
        return [
          constants.PageNames.CLASS_MGMT_PAGE,
          constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          constants.PageNames.CLASS_ENROLL_MGMT_PAGE,
        ].includes(this.pageName);
      },
      usersLink() {
        return { name: constants.PageNames.USER_MGMT_PAGE };
      },
      usersActive() {
        return this.pageName === constants.PageNames.USER_MGMT_PAGE;
      },
      dataLink() {
        return { name: constants.PageNames.DATA_EXPORT_PAGE };
      },
      dataActive() {
        return this.pageName === constants.PageNames.DATA_EXPORT_PAGE;
      },
      contentLink() {
        return { name: constants.PageNames.CONTENT_MGMT_PAGE };
      },
      contentActive() {
        return this.pageName === constants.PageNames.CONTENT_MGMT_PAGE;
      },
    },
    vuex: {
      getters: {
        isDeviceOwner: state => state.core.session.kind[0] === UserKinds.SUPERUSER,
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
    border-radius: $radius
    background: $core-bg-light

  .top a
    padding: 0.6em 2em
    color: $core-text-annotation
    text-decoration: none

  .top .active
    border-bottom: 0.3em $core-action-normal solid
    color: $core-text-default
    cursor: default

</style>
