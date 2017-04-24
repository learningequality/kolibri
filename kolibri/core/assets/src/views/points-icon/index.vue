<template>

  <div>
    <file-svg v-if="active" src="./icons/leaf.svg"/>
    <file-svg v-else src="./icons/grey-leaf.svg"/>
  </div>

</template>


<script>

  module.exports = {
    props: {
      active: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
