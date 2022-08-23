<template>

  <div :style="wrapperStyles">
    <ImmersiveToolbar
      ref="appBar"
      :appBarTitle="(!loading ? appBarTitle : '')"
      :route="route"
      :icon="icon"
    />
    <slot></slot>
    <KLinearLoader
      v-if="loading"
      class="loader"
      type="indeterminate"
      :delay="false"
    />
  </div>

</template>


<script>

  import ImmersiveToolbar from '../ImmersiveToolbar';

  export default {
    name: 'ImmersivePage',
    components: { ImmersiveToolbar },
    props: {
      appBarTitle: {
        type: String,
        default: '',
      },
      route: {
        type: Object,
        default: null,
      },
      appearanceOverrides: {
        type: Object,
        required: false,
        default: null,
      },
      icon: {
        type: String,
        default: 'close',
      },
      loading: {
        type: Boolean,
        default: null,
      },
    },
    data() {
      return {
        appBarHeight: 0,
      };
    },
    computed: {
      wrapperStyles() {
        return this.appearanceOverrides
          ? this.appearanceOverrides
          : {
              width: '100%',
              display: 'inline-block',
              backgroundColor: this.$themePalette.grey.v_100,
              paddingLeft: '32px',
              paddingRight: '32px',
              paddingBottom: '72px',
              paddingTop: this.appBarHeight + 16 + 'px',
            };
      },
    },
    mounted() {
      if (this.$refs.appBar) {
        this.appBarHeight = this.$refs.appBar.$el.clientHeight;
      }
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    position: fixed;
    top: 64px;
    right: 0;
    left: 0;
  }

</style>
