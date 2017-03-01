<template>

  <div>
    <router-link :to="classEnrollLink" class="table-name">
      Enroll
    </router-link>
  </div>

</template>


<script>

  const constants = require('../../state/constants');

  module.exports = {
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    computed: {
      classEnrollLink() {
        return {
          name: constants.PageNames.CLASS_ENROLL_MGMT_PAGE,
          params: { classId: this.classId },
        };
      },
    },
    vuex: {
      getters: {
        classId: state => state.pageState.classId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
