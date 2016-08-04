<template>

  <div class="top">
    <a v-link="usersLink" :class="{active: usersActive}">Users</a>
    |
    <a v-link="dataLink" :class="{active: dataActive}">Data</a>
    |
    <a v-link="contentLink" :class="{active: contentActive}">Content</a>
  </div>

</template>


<script>

  const constants = require('../../state/constants');

  module.exports = {
    computed: {
      usersLink() {
        return { name: constants.PageNames.USER_PAGE };
      },
      usersActive() {
        return this.pageName === constants.PageNames.USER_PAGE;
      },
      dataLink() {
        return { name: constants.PageNames.DATA_PAGE };
      },
      dataActive() {
        return this.pageName === constants.PageNames.DATA_PAGE;
      },
      contentLink() {
        return { name: constants.PageNames.CONTENT_PAGE };
      },
      contentActive() {
        return this.pageName === constants.PageNames.CONTENT_PAGE;
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

  .top
    width: 100%
    padding: 20px

  .active
    color: turquoise
    cursor: default

</style>
