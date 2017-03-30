<template>

  <div>
    <ui-button color="primary" class="ttn">Learner</ui-button>
    <ui-button color="secondary" class="ttn">Coach</ui-button>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'ui-button': require('keen-ui/src/UiButton'),
    },
    props: {
      currentRole: {
        type: String, /* coach, learner, admin */
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .ttn
    text-transform: none

  .foo
    text-align: center

</style>
