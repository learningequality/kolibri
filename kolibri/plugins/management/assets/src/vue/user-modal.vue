<template>

  <form id="user-creation">
    <h3>New User:</h3>
    <br>Username: <input type="text" v-model="userName" placeholder="Please type in your username."><br>
    <br>Password: <input type="text" v-model="passWord" placeholder="Please type in your password."><br>
    <br>First name: <input type="text" v-model="firstName" placeholder="Please type in your first name."><br>
    <br>Last name: <input type="text" v-model="lastName" placeholder="Please type in your last name."><br>
    <!-- radio buttons for electing role -->
    <h3>Role:</h3>
    <br>Learner <input type="radio" name="picked" value="learner" v-model="picked"><br>
    <br>Admin <input type="radio" name="picked" value="admin" v-model="picked"><br>

    <p><pre>data: {{$data | json 2}}</pre></p>

    <button type="button" @click="createNewUser">Create User</button>
  </form>

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
        picked: 'learner',
      };
    },
    methods: {
      createNewUser() {
        const payload = {
          password: this.passWord,
          username: this.userName,
          first_name: this.firstName,
          last_name: this.lastName,
          facility: 1,
        };
        this.createUser(payload);
      },
    },
    vuex: {
      actions: {
        createUser: actions.createUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .roster, .sidebar
    display: inline-block

  .learner-count
    border: solid, 1px, black

</style>