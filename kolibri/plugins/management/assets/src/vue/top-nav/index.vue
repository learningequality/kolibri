<template>

  <div class="top">
    <div class="links">
      <router-link :to="usersLink" :class="{active: usersActive}" @click.native="blur">
        Users
      </router-link>
      <router-link :to="dataLink" :class="{active: dataActive}" @click.native="blur">
        Data
      </router-link>
      <router-link :to="contentLink" :class="{active: contentActive}" @click.native="blur" v-if="isDeviceOwner">
        Content
      </router-link>
    </div>
  </div>

</template>


<script>

  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;
  const constants = require('../../state/constants');

  module.exports = {
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
    @media screen and (max-width: $medium-breakpoint)
      margin-top: 0
      margin-bottom: 0
      padding: 1em 0.2em

  .links
    @media screen and (max-width: $medium-breakpoint)
      text-align: center

  .top a
    padding: 0.6em 2em
    text-decoration: none
    color: $core-text-annotation
    @media screen and (max-width: $medium-breakpoint)
      padding: 0.6em 1em

  .top .active
    color: $core-text-default
    cursor: default
    border-bottom: 0.3em $core-action-normal solid

</style>
