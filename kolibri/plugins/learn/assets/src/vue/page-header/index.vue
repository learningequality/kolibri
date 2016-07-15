<template>

  <div class='header-wrapper'>
    <div class='extra-nav'>
      <slot name='extra-nav'></slot>
    </div>
    <h2 class='header'>
      <div class='icon-wrapper'>
        <slot name='icon'></slot>
      </div>
      <div class='text'>
        {{ title }}
      </div>
    </h2>
  </div>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="stylus">

  /** WARNING - unscoped styles for children                  */
  /* use very precise selectors to minimize risk of collision */

  @require '~core-theme.styl'

  .header-wrapper .extra-nav a
    color: $core-text-annotation
    font-weight: 700

  // @stylint off
  .header-wrapper .icon-wrapper > *
  // @stylint on
    width: 1em
    height: 1em

</style>


<style lang="stylus" scoped>

  .header-wrapper
    margin-top: 1em

  .extra-nav
    font-size: 12px
    min-height: 16px

  .header
    position: relative
    margin-top: 0.3em

  .icon-wrapper
    display: block
    position: absolute
    top: 5px

  .text
    display: block
    margin-left: 45px

</style>
