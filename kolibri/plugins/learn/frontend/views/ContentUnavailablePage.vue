<template>

  <LearnAppBarPage
    :appBarTitle="learnString('learnLabel')"
    :loading="pageLoading"
  >
    <NoResourcePage />
  </LearnAppBarPage>

</template>


<script>

  import { pageLoading } from 'kolibri-common/composables/usePageLoading';
  import LearnAppBarPage from './LearnAppBarPage';
  import NoResourcePage from './LibraryPage/NoResourcePage.vue';
  import { learnString } from './commonLearnStrings';

  export default {
    name: 'ContentUnavailablePage',

    components: {
      LearnAppBarPage,
      NoResourcePage,
    },
    setup() {
      return { pageLoading, learnString };
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    margin-top: 42px; // height of toolbar
  }

</style>
