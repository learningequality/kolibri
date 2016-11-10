<template>

  <div class="tabs">
    <a v-link="recentviewlink" :class="{ active: isrecentview }">Recent</a>
    <a v-link="allviewlink" :class="{ active: !isrecentview }">Topics</a>
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

  .tabs a
    background-color: $core-bg-canvas
    color: $core-action-normal
    border: none
    padding: 5px 15px
    font-size: 1em
    border-radius: 0
    border-bottom: solid 3px white
    margin-top: 5px
    &:hover
      color: $core-action-dark

  .tabs a.active
    background-color: $core-bg-light
    border-bottom: solid 3px $core-action-normal

  .tabcontents
    background-color: $core-bg-light

</style>
