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

    <k-modal
      :title="$tr('errorDetailsHeader')"
      :cancelText="$tr('closeErrorModalButtomPrompt')"
      v-if="showDetailsModal"
      class="error-detail-modal"
    >
      <code>
        {{ error || "Error Placeholder" }}
      </code>

      <div class="error-copying-options">
        <p>
          <k-button
            :primary="false"
            :text="$tr('copyToClipboardButtonPrompt')"
          />
        </p>
        <p>
          <k-button
            appearance="basic-link"
            :text="$tr('downloadAsTextPrompt')"
          />
        </p>
      </div>


      <!-- break out into a new div?  -->
      <h2> {{ $tr('errorReportingDirectionsHeader') }} </h2>

      <h3> {{ $tr('forumPrompt') }} </h3>
      <p> {{ $tr('forumDescription') }} </p>
      <k-external-link
        :text="forumLink"
        :href="forumLink"
      />

      <h3> {{ $tr('emailPrompt') }} </h3>
      <p> {{ $tr('emailDescription') }} </p>
      <!-- email link goes here. Probably not an href? -->


    </k-modal>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kModal from 'kolibri.coreVue.components.kModal';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import logo from 'kolibri.coreVue.components.logo';

  export default {
    name: 'app-error',
    $trs: {
      defaultErrorHeader: 'Sorry! Something went wrong!',
      defaultErrorExitPrompt: 'Back to home',
      defaultErrorMessage:
        'We care about your experience on Kolibri and are working hard to fix this issue.',
      defaultErrorResolution: 'Try refreshing this page or going back to the home page.',
      defaultErrorReportPrompt: 'Help us by reporting this error',
      errorDetailsHeader: 'Error details',
      copyToClipboardButtonPrompt: 'Copy to clipboard',
      downloadAsTextPrompt: 'Or download as .text file',
      errorReportingDirectionsHeader: 'How to report your error',
      forumPrompt: 'Visit our community forums',
      // reall long
      forumDescription: '',
      emailPrompt: 'Email us',
      emailDescription:
        "Contact our support team with your error details and we'll do our best to help.",
      closeErrorModalButtomPrompt: 'Close',
    },
    components: {
      authMessage,
      kButton,
      kExternalLink,
      kRouterLink,
      kModal,
      logo,
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

  .error-detail-modal {
    text-align: left;
  }

  .error-copying-options {
    text-align: right;
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
