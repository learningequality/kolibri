<template>

  <div>
    <!-- temporary hack, resolves flicker when using other templates -->
    <template v-if="navBarNeeded">

      <ImmersiveToolbar
        v-if="immersivePage"
        :appBarTitle="toolbarTitle || appBarTitle"
        :icon="immersivePageIcon"
        :route="immersivePageRoute"
        :primary="immersivePagePrimary"
        :height="headerHeight"
        @nav-icon-click="$emit('navIconClick')"
      />

      <template v-else>
        <AppBar
          class="app-bar align-to-parent"
          :title="toolbarTitle || appBarTitle"
          :height="headerHeight"
          :navShown="navShown"
          @toggleSideNav="navShown=!navShown"
        >
          <div slot="app-bar-actions" class="app-bar-actions">
            <slot name="app-bar-actions"></slot>
          </div>
        </AppBar>
        <SideNav
          :navShown="navShown"
          :headerHeight="headerHeight"
          :width="navWidth"
          @toggleSideNav="navShown=!navShown"
        />
      </template>

    </template>

    <AppBody
      :topGap="headerHeight"
      :bottomGap="bottomMargin"
    >
      <AuthMessage
        v-if="notAuthorized"
        :authorizedRole="authorizedRole"
        :header="authorizationErrorHeader"
        :details="authorizationErrorDetails"
      />
      <AppError v-else-if="error" />
      <slot v-else></slot>
    </AppBody>

    <GlobalSnackbar />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import AppBar from 'kolibri.coreVue.components.AppBar';
  import SideNav from 'kolibri.coreVue.components.SideNav';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import AppError from './AppError';
  import AppBody from './AppBody';
  import GlobalSnackbar from './GlobalSnackbar';
  import ImmersiveToolbar from './ImmersiveToolbar';

  export default {
    name: 'CoreBase',
    $trs: {
      kolibriMessage: 'Kolibri',
      kolibriTitleMessage: '{ title } - Kolibri',
      errorPageTitle: 'Error',
    },
    components: {
      AppBar,
      AppError,
      ImmersiveToolbar,
      SideNav,
      AuthMessage,
      AppBody,
      GlobalSnackbar,
    },
    mixins: [responsiveWindow],
    props: {
      appBarTitle: {
        type: String,
        required: false,
        default: '',
      },
      // Prop that determines whether to show nav components
      navBarNeeded: {
        type: Boolean,
        default: true,
      },
      // reserve space at the bottom for floating widgets
      bottomMargin: {
        type: Number,
        default: 0,
      },
      // AUTHORIZATION SPECIFIC
      authorized: {
        type: Boolean,
        required: false,
        default: true,
      },
      authorizedRole: {
        type: String,
        required: false,
      },
      authorizationErrorHeader: {
        type: String,
        required: false,
      },
      authorizationErrorDetails: {
        type: String,
        required: false,
      },
      // IMMERSIVE-SPECIFIC
      immersivePage: {
        type: Boolean,
        required: false,
        default: false,
      },
      immersivePageIcon: {
        type: String,
        required: false,
        default: 'close',
      },
      immersivePageRoute: {
        type: Object,
        required: false,
      },
      // determines the color, primary being the classic kolibri appbar color
      immersivePagePrimary: {
        type: Boolean,
        required: false,
      },
      toolbarTitle: {
        type: String,
        required: false,
        default: '',
      },
    },
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('kolibriTitleMessage', { title: this.$tr('errorPageTitle') });
          }
          if (!title) {
            // If no child component sets title, it reads 'Kolibri'
            return this.$tr('kolibriMessage');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
      };
    },
    data: () => ({ navShown: false }),
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      headerHeight() {
        return this.windowIsSmall ? 56 : 64;
      },
      navWidth() {
        return this.headerHeight * 4;
      },
      notAuthorized() {
        // catch "not authorized" error, display AuthMessage
        if (this.error && this.error.code == 403) {
          return true;
        }
        return !this.authorized;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .align-to-parent {
    position: absolute;
    top: 0;
    left: 0;
  }

  .app-bar {
    width: 100%;
    height: 64px;
  }

  .app-bar-actions {
    display: inline-block;
  }

</style>
