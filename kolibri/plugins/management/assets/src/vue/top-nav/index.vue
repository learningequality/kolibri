<template>

  <div class="top">
    <div class="links">
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

  @require '~kolibri.styles.coreTheme'

  .top
    position: relative
    top: 1em
    padding: 1em 2em
    background: $core-bg-light
    border-radius: $radius

  .top a
    padding: 0.6em 2em
    text-decoration: none
    color: $core-text-annotation

  .top .active
    color: $core-text-default
    cursor: default
    border-bottom: 0.3em $core-action-normal solid

</style>
