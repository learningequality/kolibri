<template>

  <div class="top">
    <div class="links">
      <a v-link="usersLink" :class="{active: usersActive}" @click="blur">Users</a>

      <a v-link="dataLink" :class="{active: dataActive}" @click="blur">Data</a>

      <a v-link="contentLink" :class="{active: contentActive}" @click="blur">Content</a>
    </div>
  </div>

</template>


<script>

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
        pageName: state => state.pageName,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .top
    position: relative
    top: 1em
    width: 100%
    padding: 1em 2em
    background: $core-bg-light
    border-radius: $radius
    @media screen and (max-width: $portrait-breakpoint)
      padding: 1em 0.2em

  .links
    @media screen and (max-width: $portrait-breakpoint)
      text-align: center

  .top a
    padding: 0.6em 2em
    text-decoration: none
    color: $core-text-annotation
    @media screen and (max-width: $portrait-breakpoint)
      padding: 0.6em 1em

  .top .active
    color: $core-text-default
    cursor: default
    border-bottom: 0.3em $core-action-normal solid

</style>
