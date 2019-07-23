<template>

  <div class="narrow-container">
    <UserCreateForm class="form" />
  </div>

</template>


<script>

  import UserCreateForm from './UserCreateForm';

  export default {
    name: 'UserCreatePage',
    components: {
      UserCreateForm,
    },
    mounted() {
      this.$store.dispatch('notLoading');
    },
  };

</script>


<style lang="scss" scoped>

  .narrow-container {
    width: 500px;
    margin: auto;
  }

  .form {
    max-width: 400px;
    min-height: 950px;
    margin-right: auto;
    margin-bottom: 100px;
    margin-left: auto;
  }

</style>
