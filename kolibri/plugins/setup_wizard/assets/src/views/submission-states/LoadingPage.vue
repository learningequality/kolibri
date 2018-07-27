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
      loadingPageHeader: 'Setting up your facility...',
      loadingPageSubheader: 'Please be patient. Setup may take several minutes',
    },
  };

</script>


<style lang="scss" scoped></style>
