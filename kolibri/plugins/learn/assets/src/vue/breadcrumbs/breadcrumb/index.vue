<template>

  <a v-link="linkobject">
    <span v-if="showarrow" class="visuallyhidden">{{ $tr('back') }}</span>
    <svg v-if="showarrow" role="presentation" src="../../icons/folder_back.svg"></svg>
    {{ text }}
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
      back: 'Back to previous topic',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  a
    display: inline-block
    vertical-align: middle
    font-size: 0.9em
    font-weight: 300
    max-width: 140px
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis

  svg
    fill: $core-text-annotation

</style>
