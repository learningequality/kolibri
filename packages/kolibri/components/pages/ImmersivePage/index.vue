<template>

  <div class="main">
    <ScrollingHeader :scrollPosition="0">
      <ImmersiveToolbar
        ref="appBar"
        :appBarTitle="!loading ? appBarTitle : ''"
        :route="route"
        :icon="icon"
        :isFullscreen="primary"
      >
        <template #actions>
          <slot name="actions"></slot>
        </template>
      </ImmersiveToolbar>
      <KLinearLoader
        v-if="isLoading"
        type="indeterminate"
        :delay="false"
      />
    </ScrollingHeader>
    <div
      id="main"
      class="main-wrapper"
      :style="wrapperStyles"
    >
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ScrollingHeader from '../ScrollingHeader';
  import ImmersiveToolbar from './internal/ImmersiveToolbar';

  export default {
    name: 'ImmersivePage',
    components: { ImmersiveToolbar, ScrollingHeader },
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
      primary: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
    data() {
      return {
        appBarHeight: 0,
      };
    },
    computed: {
      ...mapGetters(['isPageLoading']),
      isLoading() {
        return this.isPageLoading || this.loading;
      },
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
