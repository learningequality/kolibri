<template>

  <div class="app-error">

    <!-- kolibri image? -->
    <logo class="logo" />
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
      <!-- button link to go back to "home"? -->
      <k-router-link
        appearance="raised-button"
        :to="{route: '/'}"
        :primary="true"
        :text="$tr('defaultErrorExitPrompt')"
      />
    </p>
    <p>
      <!-- link button to open reporting modal -->
      <k-button
        appearance="basic-link"
        :text="$tr('defaultErrorReportPrompt')"
        @click="revealDetailsModal()"
      />

    </p>

    <error-details-modal
      v-if="showDetailsModal"
      @cancel="hideDetailsModal"
    />

  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import logo from 'kolibri.coreVue.components.logo';
  import errorDetailsModal from './error-details-modal';

  export default {
    name: 'appError',
    $trs: {
      defaultErrorHeader: 'Sorry! Something went wrong!',
      defaultErrorExitPrompt: 'Back to home',
      defaultErrorMessage:
        'We care about your experience on Kolibri and are working hard to fix this issue.',
      defaultErrorResolution: 'Try refreshing this page or going back to the home page.',
      defaultErrorReportPrompt: 'Help us by reporting this error',
    },
    components: {
      kButton,
      kExternalLink,
      kRouterLink,
      logo,
      errorDetailsModal,
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
