<template>

  <div class="tabs">
    <a v-link="recentviewlink">
      <div class="tab" :class="{ active: isrecentview }">Recent</div>
    </a>
    <a v-link="allviewlink">
      <div class="tab" :class="{ active: !isrecentview }">Topics</div>
    </a>
  </div>

</template>


<script>

  module.exports = {
    props: {
      recentviewlink: {
        type: Object,
        required: true,
      },
      allviewlink: {
        type: Object,
        required: true,
      },
      isrecentview: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  .tabs
    margin-top: 0.5em
    margin-bottom: 0.5em
    background-color: $core-bg-light

  a
    display: inline-block
    text-decoration: none


  .tab
    display: inline-block
    padding: 1em
    color: $core-text-default
    background-color: $core-bg-light
    border-bottom: solid 3px $core-bg-light

  .active
    border-bottom: solid 3px $core-action-normal

</style>
