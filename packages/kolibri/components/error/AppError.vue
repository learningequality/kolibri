<template>

  <div
    role="alert"
    class="app-error"
  >
    <img src="./app-error-bird.png" >

    <h1>
      {{ headerText }}
    </h1>

    <p
      v-for="paragraph in paragraphTexts"
      :key="paragraph"
    >
      {{ paragraph }}
    </p>

    <p>
      <KButtonGroup>
        <slot name="buttons">
          <KButton
            v-if="!isPageNotFound"
            :text="coreString('refresh')"
            :primary="true"
            @click="reloadPage"
          />
          <KButton
            :primary="isPageNotFound"
            appearance="raised-button"
            :text="exitButtonLabel"
            @click="handleClickBackToHome"
          />
        </slot>
      </KButtonGroup>
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
      :error="error"
      @cancel="hideDetailsModal"
    />
  </div>

</template>


<script>

  import get from 'lodash/get';
  import { mapActions, mapState } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ReportErrorModal from './ReportErrorModal';

  export default {
    name: 'AppError',
    components: {
      ReportErrorModal,
    },
    mixins: [commonCoreStrings],
    props: {
      /* Generalize the component to just show the title */
      hideParagraphs: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        showDetailsModal: false,
      };
    },
    computed: {
      ...mapState({
        error: state => state.core.error,
      }),
      headerText() {
        if (this.isPageNotFound) {
          return this.$tr('resourceNotFoundHeader');
        }
        return this.$tr('defaultErrorHeader');
      },
      paragraphTexts() {
        if (this.hideParagraphs) {
          return [];
        }
        if (this.isPageNotFound) {
          return [this.$tr('resourceNotFoundMessage')];
        }
        return [this.$tr('defaultErrorMessage'), this.$tr('defaultErrorResolution')];
      },
      // HACK since the error is stored as a string, we have to re-parse it to get the error code
      errorObject() {
        if (this.error) {
          try {
            return JSON.parse(this.error);
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
          get(this.errorObject, 'status') === 404 &&
          get(this.errorObject, 'config.method') === 'get'
        );
      },
      exitButtonLabel() {
        return this.$tr('defaultErrorExitPrompt');
      },
    },
    methods: {
      ...mapActions(['clearError']),
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
        this.clearError();
        this.$router.push({ path: '/' });
      },
    },
    $trs: {
      defaultErrorHeader: {
        message: 'Sorry! Something went wrong!',
        context:
          'This is a generic error message that the user will see when an error has occurred.',
      },
      // eslint-disable-next-line
      defaultErrorExitPrompt: {
        message: 'Back to home',
        context:
          'If Kolibri produces an unexpected error, this link appears which take the user back to the homepage.',
      },
      defaultErrorMessage: {
        message: 'We care about your experience on Kolibri and are working hard to fix this issue',
        context:
          'Error message that a user will see if an error that is the result of a known bug has occurred.',
      },
      defaultErrorResolution: {
        message: 'Try refreshing this page or going back to the home page',
        context:
          'Helper text which advises the user to refresh their browser if an error has occurred, or go back to the home page.',
      },
      defaultErrorReportPrompt: {
        message: 'Help us by reporting this error',
        context:
          'Text that informs the user about how to report an error if they see one in Kolibri.',
      },
      resourceNotFoundHeader: {
        message: 'Resource not found',
        context:
          'Error message that may appear if Kolibri cannot find a learning resource such as a video or a quiz.',
      },
      resourceNotFoundMessage: {
        message: 'Sorry, that resource does not exist',
        context:
          'Message that appears when a user tries to access a learning resource that is not available in Kolibri.',
      },
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
