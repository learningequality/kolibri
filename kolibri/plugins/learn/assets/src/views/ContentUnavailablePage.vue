<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <NoResourcePage />
  </LearnAppBarPage>

</template>


<script>

  import LearnAppBarPage from './LearnAppBarPage';
  import NoResourcePage from './LibraryPage/NoResourcePage.vue';

  export default {
    name: 'ContentUnavailablePage',

    components: {
      LearnAppBarPage,
      NoResourcePage,
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    margin-top: 42px; // height of toolbar
  }

</style>
