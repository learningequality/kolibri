<template>

  <div class="main-wrapper" :style="wrapperStyles">
    <ImmersiveToolbar
      ref="appBar"
      :appBarTitle="appBarTitle"
      :route="route"
    />
    <slot></slot>
  </div>

</template>


<script>

  import ImmersiveToolbar from 'kolibri.coreVue.components.ImmersiveToolbar';

  export default {
    name: 'ImmersivePageRoot',
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
    },
    data() {
      return {
        appBarHeight: 0,
      };
    },
    computed: {
      wrapperStyles() {
        return {
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
      this.appBarHeight = this.$refs.appBar.$el.clientHeight;
    },
  };

</script>
