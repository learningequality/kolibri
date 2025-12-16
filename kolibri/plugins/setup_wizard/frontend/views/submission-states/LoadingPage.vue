<template>

  <SubmissionStatePage :header="$tr('loadingPageHeader')">
    {{ $tr('loadingPageSubheader') }}
  </SubmissionStatePage>

</template>


<script>

  import SubmissionStatePage from './SubmissionStatePage';

  export default {
    name: 'LoadingPage',
    components: { SubmissionStatePage },
    $trs: {
      loadingPageHeader: {
        message: 'Setting up your facility...',
        context: 'Message on loading page when facility set up is in progress.',
      },
      loadingPageSubheader: {
        message: 'Please be patient. Setup may take several minutes',
        context: "Description below 'Setting up your facility...' message.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
