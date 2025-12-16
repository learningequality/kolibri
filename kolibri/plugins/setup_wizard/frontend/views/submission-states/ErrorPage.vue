<template>

  <SubmissionStatePage :header="$tr('errorPageHeader')">
    <p class="error-page-subheader">
      {{ $tr('errorPageSubheader') }}
    </p>

    <KButton
      class="error-page-retry-button"
      :text="$tr('errorPageRetryButtonLabel')"
      :primary="true"
      @click="refreshPage"
    />

    <p
      class="error-page-subtext"
      :style="{ color: $themeTokens.annotation }"
    >
      {{ $tr('errorPageAdditionalGuidance') }}
    </p>
  </SubmissionStatePage>

</template>


<script>

  import SubmissionStatePage from './SubmissionStatePage';

  export default {
    name: 'ErrorPage',
    components: { SubmissionStatePage },
    inject: ['wizardService'],
    methods: {
      refreshPage() {
        this.wizardService.send('START_OVER');
        global.location.reload(true);
      },
    },
    $trs: {
      errorPageHeader: {
        message: 'Something went wrong',
        context: 'Generic error message.',
      },
      errorPageSubheader: {
        message: 'Please check your server connection and retry.',
        context: 'Error message containing some helper information.',
      },
      errorPageAdditionalGuidance: {
        message: "If retrying doesn't work, restart the server and refresh the page.",
        context: 'Guidance for the admin for handling errors.',
      },
      errorPageRetryButtonLabel: {
        message: 'Retry',
        context: 'Button to aid admin troubleshooting.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .error-page-subheader {
    margin-bottom: 24px;
  }

  .error-page-retry-button {
    margin-bottom: 16px;
  }

  .error-page-subtext {
    font-size: 12px;
  }

</style>
