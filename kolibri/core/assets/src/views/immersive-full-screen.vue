<template>

  <div class="whole-page">
    <div class="top-bar">
      <router-link class="back-btn" :to="backPageLink">
        <mat-svg
          class="back svg-back"
          category="navigation"
          name="arrow_back"
          :class="{ 'rtl-icon': isRtl }"
        />
        <p class="back">{{ backPageText }}</p>
      </router-link>
    </div>
    <div class="wrapper">
      <div
        class="page-body"
        :style="{ padding: windowSize.breakpoint < 2 ? '16px' : '32px' }"
      >
        <slot></slot>
      </div>
    </div>
  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'immersiveFullScreen',
    mixins: [responsiveWindow],
    props: {
      backPageLink: {
        type: Object,
        required: true,
        validator: validateLinkObject,
      },
      backPageText: {
        type: String,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .whole-page
    left: 0
    top: 0
    z-index: 24
    width: 100%
    height: 100%
    position: fixed
    background-color: $core-bg-canvas

  .top-bar
    height: 60px
    background-color: $core-action-dark
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)

  .back-btn
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
    font-size: 1.2em

  p
    margin: 0

  .page-body
    max-width: 1000px
    margin: auto

  .wrapper
    position: absolute
    top: 60px
    right: 0
    bottom: 0
    left: 0
    overflow-y: auto

</style>
