<template>

  <div>
    <div class="page-header">
      <h1>Kolibri Style Guide</h1>
    </div>
    <sidenav class="sidenav"></sidenav>
    <router-view class="content"></router-view>
  </div>

</template>


<script>

  module.exports = {
    components: {
      sidenav: require('./shell/sidenav'),
    }
  };

</script>


<style lang="stylus">

  @import '~vuep/dist/vuep.css'

  $sidenav-width = 13em
  $page-header-height = 3em
  $left-padding = 25px

  // Reset some of the styles inherited from the main Kolibri theme.
  // TODO: Remove that inheritance and have a clean slate style-wise.
  html,
  body
    height: auto
    background: white

  html
    overflow: initial

  body
    padding-left: $sidenav-width

  .page-header
    background: #996189
    color: white

    height: $page-header-height
    line-height: $page-header-height
    padding-left: $left-padding

    position: fixed
    left: 0
    right: 0
    top: 0
    z-index: 999

    h1
      margin: 0
      font-size: 1.125em
      font-weight: 500

  .sidenav
    position: fixed
    top: $page-header-height
    bottom: 0
    left: 0
    right: initial
    overflow-y: auto
    width: $sidenav-width

  .content
    padding: 2em
    padding-top: $page-header-height
    line-height: 1.3em

    h1,
    h2,
    h3
      color: #333

    h2,
    h3
      margin-top: 2em
      margin-bottom: 0.5em

    h4
      margin-bottom: 0.5em

    p
      margin-top: 0
      max-width: 50em

    ul
      margin-top: 0.5em

      li
        margin-bottom: 0.3em

  .vuep
    flex-direction: column-reverse
    margin-top: 1.3em

    .vuep-preview,
    .vuep-editor
      width: 100%
      height: 40em

    .vuep-preview
      padding: 10px
      border: none

    .vuep-editor
      height: auto

  table,
  th,
  td
    border: 1px solid darkgray
    border-collapse: collapse

  th, td
    padding: 0.6em

  th
    background: #e0e0e0
    text-align: left

  // Add some hidden space before all the heading elements with ID, so when we
  // use anchor link to jump to them, they won't be partially obscured by the
  // fixed page header.
  h1, h2, h3, h4
    &[id]:before
      content: ''
      display: block
      visibility: hidden
      height: $page-header-height
      margin-top: (-1 * $page-header-height)

</style>
