<template>

  <div>

    <div class="label">{{ $tr('viewbylabel') }}</div>

    <div class="left-text" :class="{ selected: iscontent }">{{ $tr('contents') }}</div>

    <div class="toggle-switch-wrapper">
      <a v-link="vlink">
        <div class="toggle-switch" :class="{ disabled: disabled }">
          <div class="toggle-switch-slider" :class="{ selected: iscontent }"></div>
        </div>
      </a>
    </div>

    <div class="right-text" :class="{ selected: !iscontent }">{{ $tr('learners') }}</div>

  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'view-by-switch',
    $trs: {
      viewbylabel: 'View by:',
      contents: 'Contents',
      learners: 'Learners',
    },
    props: {
      iscontent: {
        type: Boolean,
        required: true,
      },
      vlink: {
        type: Object,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  $switch-background-color = #e0e0e0

  .left-text, .right-text
    color: $core-text-annotation

  .label, .left-text, .toggle-switch-wrapper, .right-text
    display: inline-block
    vertical-align: middle

  .label
    margin-right: 0.5em

  .toggle-switch
    width: 3em
    height: 1.5em
    border-radius: 1em
    background-color: $switch-background-color

  .toggle-switch-slider
    width: 1.5em
    height: 1.5em
    border-radius: 1em
    margin-left: 1.5em
    background-color: $core-action-normal

  a
    display: inline-block
    text-decoration: none

  .selected
    margin-left: 0
    color: $core-text-default

  .disabled
    cursor: not-allowed

  .disabled > .toggle-switch-slider
    background-color: $core-action-light

</style>
