<template>

  <div class="app-error">

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
      <KRouterLink
        appearance="raised-button"
        :to="{path: '/'}"
        :primary="true"
        :text="$tr('defaultErrorExitPrompt')"
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

  import KButton from 'kolibri.coreVue.components.KButton';
  import KExternalLink from 'kolibri.coreVue.components.KExternalLink';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import ReportErrorModal from './ReportErrorModal';

  export default {
    name: 'AppError',
    $trs: {
      defaultErrorHeader: 'Sorry! Something went wrong!',
      defaultErrorExitPrompt: 'Back to home',
      defaultErrorMessage:
        'We care about your experience on Kolibri and are working hard to fix this issue.',
      defaultErrorResolution: 'Try refreshing this page or going back to the home page.',
      defaultErrorReportPrompt: 'Help us by reporting this error',
    },
    components: {
      KButton,
      KExternalLink,
      KRouterLink,
      ReportErrorModal,
    },
    data() {
      return {
        showDetailsModal: false,
      };
    },
    methods: {
      revealDetailsModal() {
        this.showDetailsModal = true;
      },
      hideDetailsModal() {
        this.showDetailsModal = false;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .app-error {
    margin-top: 64px;
    text-align: center;
  }

  .logo {
    width: 160px;
    height: 160px;
  }

  .button {
    margin-right: auto;
    margin-left: auto;
  }

</style>
