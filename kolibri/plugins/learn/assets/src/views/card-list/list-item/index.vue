<template>

  <router-link class="list-item" :to="link">
    <content-icon :kind="kind" class="topic-icon"/>
    <h2>{{ title }}</h2>
  </router-link>

</template>


<script>

  const validateLinkObject = require('kolibri.utils.validateLinkObject');

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
      link: {
        type: Object,
        required: true,
        validator: validateLinkObject,
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
    background-color: $core-bg-light
    border-radius: $radius
    display: block
    text-decoration: none
    padding-right: 0.5em
    padding-left: 0.5em
    padding-top: 0.5em
    padding-bottom: 0.5em
    margin-bottom: 1em

  h2
    display: inline-block
    font-size: 0.9em
    color: $core-text-default

  .topic-icon
    font-size: 1.5em
    padding-right: 0.25em
    padding-left: 0.25em

</style>
