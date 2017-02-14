<template>

  <router-link class="list-item" :to="link">
    <content-icon :kind="kind" class="topic-icon"/>
    <h2>{{ title }}</h2>
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
    padding-top: 0.5em
    padding-bottom: 0.5em

  h2
    display: inline-block
    font-size: 0.9em
    color: $core-text-default

  .topic-icon
    font-size: 1.5em
    padding-right: 0.25em
    padding-left: 0.25em

</style>
