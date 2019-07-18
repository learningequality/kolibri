<template>

  <div class="narrow-container">
    <UserCreateForm class="form" />
  </div>

</template>


<script>

  import UserCreateForm from '../UserPage/UserCreateModal';

  export default {
    name: 'UserCreatePage',
    components: {
      UserCreateForm,
    },
    props: {},
    computed: {},
    mounted() {
      this.$store.dispatch('notLoading');
    },
    methods: {},
    $trs: {
      createNewUserHeader: 'Create new user',
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
    margin-left: auto;
  }

</style>
