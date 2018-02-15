<template>

  <div>
    <!-- could avoid explicit v-on withe a dispatch in child -->
    <immersive-app-bar
      :appBarTitle="appBarTitle"
      :icon="icon"
      :height="headerHeight"
      @nav-icon-click="$emit('navIconClick')"
    />
    <!-- consolidate responsiveness settings? -->
    <app-body
      :topGap="headerHeight"
      :padding="mobile ? 16 : 32"
    >
      <slot></slot>
    </app-body>
  </div>

</template>


<script>

  import immersiveAppBar from './immersive-app-bar';
  import appBody from '../app-body';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    components: {
      immersiveAppBar,
      appBody,
    },
    mixins: [responsiveWindow],
    props: {
      appBarTitle: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        required: false,
        default: 'close',
      },
      route: {
        type: Object,
        required: false,
      },
    },
    computed: {
      mobile() {
        return this.windowSize.breakpoint < 2;
      },
      headerHeight() {
        return this.mobile ? 56 : 64;
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
