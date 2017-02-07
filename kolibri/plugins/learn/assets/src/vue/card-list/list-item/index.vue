<template>

  <router-link class="list-item" :to="link">
    <h2>
      <content-icon :kind="kind"/>
      {{ title }}
    </h2>
  </router-link>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
      link: {
        type: Object,
        required: true,
      },
      kind: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'
  @require '../../learn.styl'

  .list-item
    background-color: $core-bg-light
    border-radius: $radius
    display: block
    text-decoration: none
    padding-right: 0.5em
    padding-left: 0.5em
    padding-top: 0.25em
    padding-bottom: 0.25em

  h2
    font-size: 1.1em
    color: $core-text-default

</style>
