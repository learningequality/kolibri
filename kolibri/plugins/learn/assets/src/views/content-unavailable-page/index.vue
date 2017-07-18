<template>

  <div>
    <h1>{{ $tr('header') }}</h1>
    <p v-if="isAdmin || isSuperuser" v-html="$trHtml('adminLink')"></p>
    <p v-else>{{ $tr('notAdmin') }}</p>
  </div>

</template>


<script>

  import * as getters from 'kolibri.coreVue.vuex.getters';

  export default {
    name: 'learnContentUnavailable',
    $trs: {
      header: 'No content channels available',
      adminLink:
        'Download content channels from the <a href="/management/#/content">Content Management</a> page',
      notAdmin:
        'You need to sign in as the Device Owner to manage content. (This is the account originally created in the Setup Wizard.)',
    },
    vuex: {
      getters: {
        isAdmin: getters.isAdmin,
        isSuperuser: getters.isSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  h1
    margin-top: 42px // height of toolbar

</style>
