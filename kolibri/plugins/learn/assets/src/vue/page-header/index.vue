<template>

  <div class='header-wrapper'>
    <div class='extra-nav'>
      <slot name='extra-nav'></slot>
    </div>
    <h2 class='header'>
      <div class='icon'>
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

  /*** WARNING - unscoped styles for children ***/

  @require '~core-theme.styl'

  // use a very precise selector to minimize risk of collision
  .header-wrapper .extra-nav a
    color: $core-text-annotation
    font-weight: 700

</style>


<style lang="stylus" scoped>

  .header-wrapper
    margin-top: 2em

  .extra-nav
    font-size: 12px

  .header
    position: relative
    margin-top: 0.5em

  .icon
    display: block
    position: absolute
    top: 5px

  .text
    display: block
    margin-left: 45px

</style>
