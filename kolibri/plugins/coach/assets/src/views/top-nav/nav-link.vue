<template>

  <router-link
    class="link"
    :to="to"
    :class="{ active: active }"
    @click.native="blur"
  >
    {{ text }}
  </router-link>

</template>


<script>

  module.exports = {
    props: {
      text: {
        type: String,
        required: true,
      },
      active: {
        type: Boolean,
      },
      to: {
        type: Object,
        required: true,
      }
    },
    methods: {
      blur(evt) {
        evt.target.blur();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .link
    padding: 0.6em 1em
    text-decoration: none
    color: $core-text-annotation
    display: inline-block

  .active
    color: $core-text-default
    border-bottom: 0.3em $core-action-normal solid

</style>
