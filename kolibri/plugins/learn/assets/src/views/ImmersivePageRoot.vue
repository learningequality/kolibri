<template>

  <div class="main-wrapper" :style="wrapperStyles">
    <ImmersiveToolbar
      v-if="!loading"
      ref="appBar"
      :appBarTitle="appBarTitle"
      :route="route"
    />
    <slot></slot>
  </div>

</template>


<script>

  import ImmersiveToolbar from 'kolibri.coreVue.components.ImmersiveToolbar';
  import { mapState } from 'vuex';

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
      applyStandardLayout: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        appBarHeight: 0,
      };
    },
    computed: {
      ...mapState({
        loading: state => state.core.loading,
      }),
      wrapperStyles() {
        return this.applyStandardLayout
          ? {
              width: '100%',
              display: 'inline-block',
              backgroundColor: this.$themePalette.grey.v_100,
              paddingLeft: '32px',
              paddingRight: '32px',
              paddingBottom: '72px',
              paddingTop: this.appBarHeight + 16 + 'px',
            }
          : '';
      },
    },
    mounted() {
      if (this.$refs.appBar) {
        this.appBarHeight = this.$refs.appBar.$el.clientHeight;
      }
    },
  };

</script>
