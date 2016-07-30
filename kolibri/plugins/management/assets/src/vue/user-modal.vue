<template>

  <div class="user-creation-modal">
    <h3>New User:</h3>
    <br>Username: <input type="text" v-model="userName" placeholder="Please type in your username."><br>
    <br>Password: <input type="text" v-model="passWord" placeholder="Please type in your password."><br>
    <br>First name: <input type="text" v-model="firstName" placeholder="Please type in your first name."><br>
    <br>Last name: <input type="text" v-model="lastName" placeholder="Please type in your last name."><br>
    <!-- radio buttons for electing role -->
    <h3>Role:</h3>
    <br>Learner <input type="radio" name="picked" value="learner" v-model="role"><br>
    <br>Admin <input type="radio" name="picked" value="admin" v-model="role"><br>

    <button type="button" @click="createNewUser">Create User</button>
  </div>

</template>


<script>

  const actions = require('../actions');

  module.exports = {
    data() {
      return {
        userName: '',
        passWord: '',
        firstName: '',
        lastName: '',
        role: 'learner',
      };
    },
    methods: {
      createNewUser() {
        const payload = {
          password: this.passWord,
          username: this.userName,
          first_name: this.firstName,
          last_name: this.lastName,
          facility: this.facility,
        };
        this.createUser(payload, this.role);
      },
    },
    vuex: {
      getters: {
        facility: state => state.facility,
      },
      actions: {
        createUser: actions.createUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .user-creation-modal
    display: inline-block

</style>