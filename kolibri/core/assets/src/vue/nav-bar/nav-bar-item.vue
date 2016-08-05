<template>

  <div class='link-wrapper'>
    <a v-if="vlink" v-link="vlink" :class="{active: active}" class='link'>
      <div class='content'>
        <slot></slot>
      </div>
    </a>
    <a v-else :href="href" :class="{active: active}" class='link'>
      <div class='content'>
        <slot></slot>
      </div>
    </a>
  </div>

</template>


<script>

  module.exports = {
    props: {
      // Note - only pass in a vlink or an href, not both
      vlink: {
        type: Object,
      },
      href: {
        type: String,
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
      vertical-align: middle

  .link
    margin: 0
    padding: 6px
    vertical-align: middle
    text-align: center
    cursor: pointer
    @media screen and (min-width: $portrait-breakpoint + 1)
      display: table-cell
      vertical-align: middle
      height: 125px
    @media screen and (max-width: $portrait-breakpoint)
      display: block

  .link.active
    color: $core-bg-light
    background: $core-action-normal

  .content
    display: inline-block

</style>
