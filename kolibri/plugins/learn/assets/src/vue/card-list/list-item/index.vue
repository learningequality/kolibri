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
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  @require '../../learn.styl'

  .list-item
    display: block
    margin-bottom: 1em
    padding-top: 0.5em
    padding-right: 0.5em
    padding-bottom: 0.5em
    padding-left: 0.5em
    border-radius: $radius
    background-color: $core-bg-light
    text-decoration: none

  h2
    display: inline-block
    color: $core-text-default
    font-size: 0.9em

  .topic-icon
    padding-right: 0.25em
    padding-left: 0.25em
    font-size: 1.5em

</style>
