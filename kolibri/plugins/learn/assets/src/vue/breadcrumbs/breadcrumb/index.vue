<template>

  <a v-link="linkobject">
    <span class='back'>
      <span v-if="showarrow" class="visuallyhidden">{{ $tr('back') }}</span>
      <svg v-if="showarrow" role="presentation" src="../../icons/back.svg"></svg>
      {{ text }}
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
      text: {
        type: String,
        default: '',
      },
      linkobject: {
        type: Object,
        required: true,
      },
    },
    $trNameSpace: 'breadcrumb',
    $trs: {
      back: 'Back',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .back
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
