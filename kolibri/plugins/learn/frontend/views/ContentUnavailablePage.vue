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

  export default {
    name: 'ContentUnavailablePage',

    components: {
      LearnAppBarPage,
      NoResourcePage,
    },
    setup() {
      return { pageLoading };
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    margin-top: 42px; // height of toolbar
  }

</style>
