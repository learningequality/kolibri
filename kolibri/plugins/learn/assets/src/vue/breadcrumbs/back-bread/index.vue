<template>

  <a v-link=breadlink>
    <span class='sep'>
      <svg v-if=showarrow role="presentation" src="../../icons/back.svg"></svg>
      {{ breadtext }}
    </span>
  </a>

</template>


<script>

  module.exports = {
    props: {
      showarrow: {
        type: Boolean,
        default: true,
      },
      breadtext: {
        type: String,
        default: 'back',
      },
      breadlink: {},
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .sep
    margin-right: 0.3em
  a
    display: inline-block
    vertical-align: middle
    margin-bottom: 2px
    font-size: 0.9em
    font-weight: 300
    max-width: 140px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    color: $core-text-annotation
  svg
    vertical-align: middle
    fill: $core-text-annotation
    margin-bottom: 2px

</style>
