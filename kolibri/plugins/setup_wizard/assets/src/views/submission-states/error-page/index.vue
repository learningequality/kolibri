<template>

  <submission-state-page :header="$tr('errorPageHeader')">

    <p class="error-page-subheader">
      {{ $tr('errorPageSubheader') }}
    </p>

    <k-button
      class="error-page-retry-button"
      :text="$tr('errorPageRetryButtonLabel')"
      :primary="true"
      @click="refreshPage"
    />

    <p class="error-page-subtext">
      {{ $tr('errorPageAdditionalGuidance') }}
    </p>


  </submission-state-page>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import submissionStatePage from '../submission-state-page';

  export default {
    name: 'onboardingErrorPage',
    components: { submissionStatePage, kButton },
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


<style scoped lang="stylus">

  @require '~kolibri.styles.definitions'

  .error-page
    &-subheader
      margin-bottom: 24px
    &-retry-button
      margin-bottom: 16px
    &-subtext
      font-size: 12px
      color: $core-text-annotation

</style>
