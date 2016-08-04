<template>

  <div class='link-wrapper'>
    <a class='link' v-link="vlink" :class="{active: active}">
      <div class='content'>
        <slot></slot>
      </div>
    </a>
  </div>

</template>


<script>

  module.exports = {
    props: {
      vlink: {
        type: Object,
        required: true,
      },
      active: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .link-wrapper
    @media screen and (min-width: $portrait-breakpoint + 1)
      display: table-row
    @media screen and (max-width: $portrait-breakpoint)
      display: table-cell

  .link
    margin: 0
    padding: 6px
    vertical-align: middle
    text-align: center
    @media screen and (min-width: $portrait-breakpoint + 1)
      display: table-cell
      height: 150px
    @media screen and (max-width: $portrait-breakpoint)
      display: block

  .link.active
    color: $core-bg-light
    background: $core-action-normal

  .content
    display: inline-block

</style>
