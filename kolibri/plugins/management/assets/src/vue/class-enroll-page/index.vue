<template>

  <div>
    <p>enroll for class {{ this.classId}}</p>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
