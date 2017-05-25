<template>

  <nav class="tabs">
    <ul>
      <slot
        :link="$options.components['tab-link']"
        :button="$options.components['tab-button']"
      />
    </ul>
  </nav>

</template>


<script>

  module.exports = {
    components: {
      'tab-link': require('./tab-link'),
      'tab-button': require('./tab-button'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .tabs
    background-color: white
    white-space: nowrap
    overflow-x: auto
    overflow-y: hidden

  ul
    margin: 0
    padding: 0

</style>
