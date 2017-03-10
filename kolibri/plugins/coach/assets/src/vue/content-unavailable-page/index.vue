<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p>
      {{ $tr('description') }}
      <span v-if="isAdminOrSuperuser" v-html="$trHtml('adminInstructions')"></span>
      <span v-else>{{ $tr('nonAdminInstructions') }}</span>
    </p>
  </div>

</template>


<script>

  const isAdminOrSuperuser = require('kolibri.coreVue.vuex.getters').isAdminOrSuperuser;

  module.exports = {
    $trNameSpace: 'learnContentUnavailable',
    $trs: {
      header: 'Coach reports unavailable',
      description: 'No channels exist',
      adminInstructions: 'Download channels from the <a href="/management/#/content">content management page</a>', // eslint-disable-line max-len
      nonAdminInstructions: 'You need to log in as an administrator to download channels',
    },
    vuex: {
      getters: {
        isAdminOrSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
