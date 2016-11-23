<template>

  <div>

    <div class="label">{{ $tr('viewbylabel') }}</div>

    <a v-link="vlink" :class="{ disabled: disabled }">
      <div class="left-text" :class="{ selected: iscontent, disabled: disabled }">{{ $tr('contents') }}</div>

      <div class="toggle-switch-wrapper">
        <div class="toggle-switch">
          <div class="toggle-switch-slider" :class="{ rightside: !iscontent, disabled: disabled }"></div>
        </div>
      </div>

      <div class="right-text" :class="{ selected: !iscontent, disabled: disabled }">{{ $tr('learners') }}</div>
    </a>
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

  .disabled
    cursor: not-allowed
    color: $core-text-disabled

  .selected
    color: $core-text-default

  .left-text,
  .right-text
    color: $core-text-annotation

  .right-text.disabled,
  .left-text.disabled
    color: $core-text-disabled

  .right-text.selected,
  .left-text.selected
    color: $core-text-default

  .label,
  .left-text,
  .toggle-switch-wrapper,
  .right-text
    display: inline-block
    vertical-align: middle

  .label
    margin-right: 0.5em

  a
    display: inline-block
    text-decoration: none

  .toggle-switch
    width: 3em
    height: 1.5em
    border-radius: 1em
    background-color: $switch-background-color

  .toggle-switch-slider
    width: 1.5em
    height: 1.5em
    border-radius: 1em
    background-color: $core-action-normal

  .toggle-switch-slider.disabled
    background-color: $core-action-light

  .rightside
    margin-left: 1.5em

</style>
