<template>

  <div class="narrow-container">
    <UserEditForm class="form" />
  </div>

</template>


<script>

  import UserEditForm from '../UserPage/EditUserModal';

  export default {
    name: 'UserEditPage',
    components: {
      UserEditForm,
    },
    props: {},
    computed: {},
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
