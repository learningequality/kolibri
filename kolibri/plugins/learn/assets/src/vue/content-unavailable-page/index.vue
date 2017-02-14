<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p v-if="isAdminOrSuperuser" v-html="$trHtml('adminLink')"></p>
    <p v-else>{{ $tr('notAdmin') }}</p>
  </div>

</template>


<script>

  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;

  module.exports = {
    $trNameSpace: 'learnContentUnavailable',
    $trs: {
      header: 'No Content Channels Available',
      adminLink: 'Download content channels from the <a href="/management/#/content">Content Management</a> page', // eslint-disable-line max-len
      notAdmin: 'You need to log in as an administrator to manage your content channels.',
    },
    vuex: {
      getters: {
        isAdminOrSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  h1
    margin-top: 42px // height of toolbar

</style>
