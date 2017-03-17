<template>

  <div id="whole-page">
    <div id="top-bar">
      <router-link id="back-btn" :to="pageLink">
        <mat-svg
          class="back svg-back"
          category="navigation"
          name="arrow_back"
        />
        <p class="back">
          <slot name="text"/>
        </p>
      </router-link>
    </div>
    <div id="page-body">
      <slot name="body"/>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: {
      backPageName: {
        type: String,
        required: true,
      },
      backPageParams: {
        type: Object,
        required: false,
      },
    },
    computed: {
      pageLink() {
        return {
          name: this.backPageName,
          params: this.backPageParams,
        };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  #whole-page
    left: 0
    top: 0
    z-index: 100
    width: 100vw
    height: 100vh
    position: fixed
    background-color: $core-bg-canvas

  #top-bar
    height: 60px
    background-color: $core-text-default
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)

  #back-btn
    top: 8px
    left: 28px
    position: relative
    cursor: pointer
    display: inline-block
    padding: 10px

  .svg-back
    fill: $core-bg-light
    margin-right: 10px

  .back
    color: $core-bg-light
    float: left
    font-weight: bold
    font-size: 1.3em

  p
    margin: 0

  #page-body
    padding: 20px
    padding-bottom: 40px
    height: inherit
    overflow-y: auto

</style>
