<template>

  <div role="alert" class="app-error">

    <img src="./app-error-bird.png">

    <h1>
      {{ headerText }}
    </h1>

    <p v-for="(paragraph, idx) in paragraphTexts" :key="idx">
      {{ paragraph }}
    </p>

    <p>
      <KButton
        v-if="!isPageNotFound"
        :text="$tr('pageReloadPrompt')"
        :primary="true"
        @click="reloadPage"
      />
      <KButton
        :primary="isPageNotFound"
        appearance="raised-button"
        :text="exitButtonLabel"
        @click="handleClickBackToHome"
      />
    </p>

    <p v-if="!isPageNotFound">
      <!-- link button to open reporting modal -->
      <KButton
        appearance="basic-link"
        :text="$tr('defaultErrorReportPrompt')"
        @click="revealDetailsModal()"
      />

    </p>

    <ReportErrorModal
      v-if="showDetailsModal"
      @cancel="hideDetailsModal"
    />

  </div>

</template>


<script>

  import get from 'lodash/get';
  import urls from 'kolibri.urls';
  import { mapActions } from 'vuex';
  import ReportErrorModal from './ReportErrorModal';

  // Inspects URL and returns an enum of the plugin (enum values are "learn", "coach", etc.)
  function getCurrentKolibriPlugin() {
    const url = window.location.href;

    function urlMatches(urlName) {
      return urls[urlName] && url.includes(urls[urlName]());
    }

    if (urlMatches('kolibri:kolibri.plugins.learn:learn')) {
      return 'LEARN';
    } else if (urlMatches('kolibri:kolibri.plugins.coach:coach')) {
      return 'COACH';
    } else if (urlMatches('kolibri:kolibri.plugins.device:device_management')) {
      return 'DEVICE';
    } else if (urlMatches('kolibri:kolibri.plugins.facility:facility_management')) {
      return 'FACILITY';
    } else if (urlMatches('kolibri:kolibri.plugins.user:user')) {
      // Probably won't be used, since Anonymous users are re-directed when
      // trying to go to Profile page
      return 'USER';
    }
  }

  export default {
    name: 'AppError',
    components: {
      ReportErrorModal,
    },
    data() {
      return {
        showDetailsModal: false,
      };
    },
    computed: {
      headerText() {
        if (this.isPageNotFound) {
          return this.$tr('pageNotFoundHeader');
        }
        return this.$tr('defaultErrorHeader');
      },
      paragraphTexts() {
        if (this.isPageNotFound) {
          return [this.$tr('pageNotFoundMessage')];
        }
        return [this.$tr('defaultErrorMessage'), this.$tr('defaultErrorResolution')];
      },
      // HACK since the error is stored as a string, we have to re-parse it to get the error code
      errorObject() {
        if (this.$store.state.core.error) {
          try {
            return JSON.parse(this.$store.state.core.error);
          } catch (err) {
            return null;
          }
        }
        return null;
      },
      isPageNotFound() {
        // Returns 'true' only if method is 'GET' and code is '404'.
        // Doesn't handle case where 'DELETE' or 'PATCH' request returns '404'.
        return (
          get(this.errorObject, 'status.code') === 404 &&
          get(this.errorObject, 'request.method') === 'GET'
        );
      },
      exitButtonLabel() {
        let stringId;
        if (this.isPageNotFound) {
          stringId =
            {
              LEARN: 'backToLearnLabel',
              COACH: 'backToCoachLabel',
              DEVICE: 'backToDeviceLabel',
              FACILITY: 'backToFacilityLabel',
            }[getCurrentKolibriPlugin()] || 'defaultErrorExitPrompt';
        } else {
          stringId = 'defaultErrorExitPrompt';
        }
        return this.$tr(stringId);
      },
    },
    methods: {
      ...mapActions(['handleError']),
      revealDetailsModal() {
        this.showDetailsModal = true;
      },
      hideDetailsModal() {
        this.showDetailsModal = false;
      },
      reloadPage() {
        // reloads without cache
        global.location.reload();
      },
      handleClickBackToHome() {
        this.handleError('');
        this.$router.push({ path: '/' });
      },
    },
    $trs: {
      defaultErrorHeader: 'Sorry! Something went wrong!',
      // eslint-disable-next-line
      defaultErrorExitPrompt: 'Back to home',
      pageReloadPrompt: 'Refresh',
      defaultErrorMessage:
        'We care about your experience on Kolibri and are working hard to fix this issue.',
      defaultErrorResolution: 'Try refreshing this page or going back to the home page.',
      defaultErrorReportPrompt: 'Help us by reporting this error',
      pageNotFoundHeader: 'Page not found',
      pageNotFoundMessage: "Sorry, we can't seem to find the page you're looking for.",
      backToCoachLabel: 'Back to Coach',
      backToDeviceLabel: 'Back to Device',
      backToFacilityLabel: 'Back to Facility',
      backToLearnLabel: 'Back to Learn',
    },
  };

</script>


<style lang="scss" scoped>

  .app-error {
    margin-top: 64px;
    text-align: center;
  }

  .logo {
    width: 160px;
    height: 160px;
  }

</style>
