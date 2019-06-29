<template>

  <div role="alert" class="app-error">

    <img src="./app-error-bird.png">
    <!-- Header message -->
    <h1>
      {{ $tr('defaultErrorHeader') }}
    </h1>

    <p>
      {{ $tr('defaultErrorMessage') }}
    </p>

    <p>
      {{ $tr('defaultErrorResolution') }}
    </p>

    <p>
      <KButton
        :text="$tr('pageReloadPrompt')"
        :primary="true"
        @click="reloadPage"
      />
      <KButton
        :primary="false"
        appearance="raised-button"
        :text="$tr('defaultErrorExitPrompt')"
        @click="handleClickBackToHome"
      />
    </p>
    <p>
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

  import { mapActions } from 'vuex';
  import KButton from 'kolibri.coreVue.components.KButton';
  import ReportErrorModal from './ReportErrorModal';

  export default {
    name: 'AppError',
    components: {
      KButton,
      ReportErrorModal,
    },
    data() {
      return {
        showDetailsModal: false,
      };
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
      defaultErrorExitPrompt: 'Back to home',
      pageReloadPrompt: 'Refresh',
      defaultErrorMessage:
        'We care about your experience on Kolibri and are working hard to fix this issue.',
      defaultErrorResolution: 'Try refreshing this page or going back to the home page.',
      defaultErrorReportPrompt: 'Help us by reporting this error',
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
