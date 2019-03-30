<template>

  <div
    class="whole-page"
    :style="{ backgroundColor: $coreBgCanvas }"
  >
    <div
      class="top-bar"
      :style="{ backgroundColor: $coreActionDark }"
    >
      <router-link class="back-btn" :to="backPageLink">
        <mat-svg
          class="back svg-back"
          :style="{ fill: $coreBgLight }"
          category="navigation"
          name="arrow_back"
          :class="{ 'rtl-icon': isRtl }"
        />
        <p
          class="back"
          :style="{ color: $coreBgLight }"
        >
          {{ backPageText }}
        </p>
      </router-link>
    </div>
    <div class="wrapper">
      <div
        class="page-body"
        :style="{ padding: windowIsSmall ? '16px' : '32px' }"
      >
        <slot></slot>
      </div>
    </div>
  </div>

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { validateLinkObject } from 'kolibri.utils.validators';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'ImmersiveFullScreen',
    mixins: [responsiveWindow, themeMixin],
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


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .whole-page {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 24;
    width: 100%;
    height: 100%;
  }

  .top-bar {
    @extend %dropshadow-4dp;

    height: 60px;
  }

  .back-btn {
    position: relative;
    top: 8px;
    left: 28px;
    display: inline-block;
    padding: 10px;
    cursor: pointer;
  }

  .svg-back {
    margin-right: 10px;
  }

  .back {
    float: left;
    font-size: 1.2em;
    font-weight: bold;
  }

  p {
    margin: 0;
  }

  .page-body {
    max-width: 1000px;
    margin: auto;
  }

  .wrapper {
    position: absolute;
    top: 60px;
    right: 0;
    bottom: 0;
    left: 0;
    overflow-y: auto;
  }

</style>
