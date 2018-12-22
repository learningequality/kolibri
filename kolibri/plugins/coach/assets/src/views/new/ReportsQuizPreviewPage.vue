<template>

  <div>
    <BackLink
      text="Some Quiz"
      :to="{ name: 'NEW_COACH_PAGES', params: { page: 'ReportsQuizLearnerListPage' } }"
    />
    <h1>{{ $tr('preview') }}</h1>
    <p>{{ coachStrings.$tr('orderFixedDescription') }}</p>
    <p>{{ coachStrings.$tr('orderRandomDescription') }}</p>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsQuizPreviewPage',
    components: {},
    mixins: [imports],
    $trs: {
      previewTitle: 'Preview',
    },
  };

</script>


<style lang="scss" scoped></style>
