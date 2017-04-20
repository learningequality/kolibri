<template>

  <div>
    <div class="wrapper">
      <content-icon :kind="kind" class="icon"/>
      <router-link v-if="link" :to="link">{{ title }}</router-link>
      <span v-else>{{ title }}</span>
    </div>
    <div class="wrapper">
      <slot name="details" />
    </div>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
    },
    props: {
      kind: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      link: {
        type: Object,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  a
    font-size: 1.15em
    font-weight: bold

  .wrapper
    font-weight: normal
    position: relative
    text-align: left
    padding: 2px 0 0 25px
    color: $core-text-annotation

  .hasicon
    padding-left: 20px

  .icon
    position: absolute
    left: 0
    fill: $core-text-default
    font-size: 1.25em

</style>
