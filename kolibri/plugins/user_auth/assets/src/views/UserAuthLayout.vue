<template>

  <div
    ref="mainWrapper"
    class="main-wrapper"
    :style="mainWrapperStyles"
  >
    <div
      v-if="!loading"
      class="scrolling-pane"
    >
      <CoreBanner v-if="coreBannerComponent && showDemoBanner">
        <template #default="props">
          <component
            :is="coreBannerComponent"
            :bannerClosed="props.bannerClosed"
          />
        </template>
      </CoreBanner>

      <KPageContainer v-if="!isAuthorized">
        <AuthMessage />
      </KPageContainer>
      <KPageContainer v-else-if="error">
        <AppError />
      </KPageContainer>

      <div
        v-else
        role="main"
        tabindex="-1"
        class="main"
      >
        <slot></slot>
      </div>
    </div>

    <!-- Monitor snackbar changes so they can be announced by assistive technologies -->
    <div aria-live="polite">
      <GlobalSnackbar />
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import AuthMessage from 'kolibri/components/AuthMessage';
  import coreBannerContent from 'kolibri-common/utils/coreBannerContent';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AppError from 'kolibri/components/error/AppError';
  import GlobalSnackbar from 'kolibri/components/GlobalSnackbar';
  import { ComponentMap } from '../constants';
  import CoreBanner from './CoreBanner';

  export default {
    name: 'UserAuthLayout',
    metaInfo() {
      return {
        // Use arrow function to bind $tr to this component
        titleTemplate: title => {
          if (this.error) {
            return this.$tr('kolibriTitleMessage', { title: this.$tr('errorPageTitle') });
          }
          // If no child component sets title, it reads 'Kolibri'
          if (!title) {
            return this.coreString('kolibriLabel');
          }
          // If child component sets title, it reads 'Child Title - Kolibri'
          return this.$tr('kolibriTitleMessage', { title });
        },
      };
    },
    components: {
      AppError,
      CoreBanner,
      AuthMessage,
      GlobalSnackbar,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapState({
        error: state => state.core.error,
        loading: state => state.core.loading,
      }),
      isAuthorized() {
        return !(
          this.error &&
          this.error.response &&
          this.error.response.status &&
          this.error.response.status == 403
        );
      },
      mainWrapperStyles() {
        return {
          width: '100vw',
          backgroundColor: this.$themePalette.grey.v_200,
          paddingTop: '0px',
          paddingBottom: '0px',
        };
      },
      coreBannerComponent() {
        return coreBannerContent[0];
      },
      showDemoBanner() {
        return [
          ComponentMap.SIGN_IN,
          ComponentMap.FACILITY_SELECT,
          ComponentMap.AUTH_SELECT,
          ComponentMap.NEW_PASSWORD,
        ].includes(this.$route.name);
      },
    },
    $trs: {
      kolibriTitleMessage: {
        message: '{ title } - Kolibri',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
      errorPageTitle: {
        message: 'Error',
        context:
          "When Kolibri throws an error, this is the text that's used as the title of the error page. The description of the error follows below.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .main-wrapper {
    display: inline-block;
    width: 100vw;

    @media print {
      /* Without this, things won't print correctly
    *  - Firefox: Tables will get cutoff
    *  - Chrome: Table header won't repeat correctly on each page
    */
      display: block;
    }
  }

  .main {
    height: 100%;
    margin-right: auto;
    margin-left: auto;
  }

  .scrolling-pane {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 0;
    margin-top: 0;
    margin-bottom: 0;
    overflow-x: auto;
  }

  .debug {
    font-family: monospace;
    font-size: large;
    font-weight: bold;
    line-height: 2em;
  }

</style>
