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

    <p class="error-page-subtext" :style="{ color: $themeTokens.annotation }">
      {{ $tr('errorPageAdditionalGuidance') }}
    </p>


  </SubmissionStatePage>

</template>


<script>

  import SubmissionStatePage from './SubmissionStatePage';

  export default {
    name: 'ErrorPage',
    components: { SubmissionStatePage },
    methods: {
      refreshPage() {
        global.location.reload(true);
      },
    },
    $trs: {
      errorPageHeader: 'Something went wrong',
      errorPageSubheader: 'Please check your server connection and retry.',
      errorPageAdditionalGuidance:
        "If retrying doesn't work, restart the server and refresh the page.",
      errorPageRetryButtonLabel: 'Retry',
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
