<template>

  <div class="user-edit-modal">
    <modal btntext="Edit">
      <div class="title" slot="header">User edit</div>
      <div slot="body">
        <br>Username: <input type="text" v-model="username" placeholder="Please type in your username."><br>
        <br>Password: <input type="text" v-model="password" placeholder="Please type in your password."><br>
        <br>First name: <input type="text" v-model="firstName" placeholder="Please type in your first name."><br>
        <br>Last name: <input type="text" v-model="lastName" placeholder="Please type in your last name."><br>
        <!-- radio buttons for selecting role -->
        <br>Learner <input type="radio" name="picked" value="learner" v-model="role"><br>
        <br>Admin <input type="radio" name="picked" value="admin" v-model="role"><br>
      </div>
      <div slot="footer">
        <button class="confirm-btn" type="button" @click="editUser">Confirm</button>
      </div>
    </modal>
  </div>

</template>


<script>

  const actions = require('../actions');

  module.exports = {
    components: {
      modal: require('./modal.vue'),
    },
    props: [
      'userid', 'username', 'firstname', 'lastname', 'roles',
    ],
    data() {
      return {
        username: this.username,
        password: '',
        firstName: this.firstname,
        lastName: this.lastname,
        role: this.roles.length ? this.roles[0].kind : 'learner',
      };
    },
    methods: {
      editUser() {
        const payload = {
          password: this.password,
          username: this.username,
          first_name: this.firstName,
          last_name: this.lastName,
          facility: this.facility,
        };
        this.updateUser(this.userid, payload, this.role);
      },
    },
    vuex: {
      getters: {
        facility: state => state.facility,
      },
      actions: {
        updateUser: actions.updateUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .title
    display: inline

  .confirm-btn
    float: right

</style>
