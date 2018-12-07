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

    <p class="error-page-subtext">
      {{ $tr('errorPageAdditionalGuidance') }}
    </p>


  </SubmissionStatePage>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';
  import SubmissionStatePage from './SubmissionStatePage';

  export default {
    name: 'ErrorPage',
    components: { SubmissionStatePage, KButton },
    $trs: {
      errorPageHeader: 'Something went wrong',
      errorPageSubheader: 'Please check your server connection and retry.',
      errorPageAdditionalGuidance:
        "If retrying doesn't work, restart the server and refresh the page.",
      errorPageRetryButtonLabel: 'Retry',
    },
    methods: {
      refreshPage() {
        global.location.reload(true);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .error-page-subheader {
    margin-bottom: 24px;
  }

  .error-page-retry-button {
    margin-bottom: 16px;
  }

  .error-page-subtext {
    font-size: 12px;
    color: $core-text-annotation;
  }

</style>
