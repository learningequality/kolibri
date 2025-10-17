<template>

  <div class="main">
    <ScrollingHeader :scrollPosition="0">
      <ImmersiveToolbar
        ref="appBar"
        :appBarTitle="!loading ? appBarTitle : ''"
        :route="route"
        :icon="icon"
        :isFullscreen="primary"
        @navIconClick="$emit('navIconClick')"
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
      <slot :pageContentHeight="pageContentHeight"></slot>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import useUser from 'kolibri/composables/useUser';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  import ScrollingHeader from '../ScrollingHeader';
  import ImmersiveToolbar from './internal/ImmersiveToolbar';

  export default {
    name: 'ImmersivePage',
    components: { ImmersiveToolbar, ScrollingHeader },
    setup() {
      const { windowHeight, windowIsSmall } = useKResponsiveWindow();
      const { isAppContext } = useUser();
      return {
        windowHeight,
        windowIsSmall,
        isAppContext,
      };
    },
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
            paddingBottom: '72px',
            paddingLeft: this.paddingLeftRight,
            paddingRight: this.paddingLeftRight,
            paddingTop: this.appBarHeight + 16 + 'px',
          };
      },
      paddingLeftRight() {
        return this.isAppContext || this.windowIsSmall ? '8px' : '32px';
      },
      pageContentHeight() {
        const paddingTop = parseInt(this.wrapperStyles.paddingTop) || 0;
        const paddingBottom = parseInt(this.wrapperStyles.paddingBottom) || 0;
        const height = this.windowHeight - paddingTop - paddingBottom - 1;
        return height;
      },
    },
    mounted() {
      if (this.$refs.appBar) {
        this.appBarHeight = this.$refs.appBar.$el.clientHeight;
      }
    },
  };

</script>
