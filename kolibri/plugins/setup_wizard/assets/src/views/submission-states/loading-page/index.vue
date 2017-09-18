<template>

  <submission-state-page :header="$tr('loadingPageHeader')">

    {{ $tr('loadingPageSubheader') }}

  </submission-state-page>

</template>


<script>

  import submissionStatePage from '../submission-state-page';

  export default {
    name: 'onboardingLoadingPage',
    components: { submissionStatePage },
    $trs: {
      loadingPageHeader: 'Setting up your facility...',
      loadingPageSubheader: 'Please be patient. Setup may take several minutes',
    },
  };

</script>


<style scoped lang="stylus"></style>