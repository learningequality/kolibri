<template>

  <div class="user-edit-modal">
    <modal btntext="Edit">
      <div class="title" slot="header">User edit</div>
      <div slot="body">
        <br>Username: <input type="text" v-model="username_new" placeholder="Please type in your username."><br>
        <br>Password: <input type="text" v-model="password_new" placeholder="Please type in your password."><br>
        <br>First name: <input type="text" v-model="firstName_new" placeholder="Please type in your first name."><br>
        <br>Last name: <input type="text" v-model="lastName_new" placeholder="Please type in your last name."><br>
        <!-- radio buttons for selecting role -->
        <br>Learner <input type="radio" value="learner" v-model="role_new"><br>
        <br>Admin <input type="radio" value="admin" v-model="role_new"><br>
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
        username_new: this.username,
        password_new: '',
        firstName_new: this.firstname,
        lastName_new: this.lastname,
        role_new: this.roles.length ? this.roles[0].kind : 'learner',
      };
    },
    methods: {
      editUser() {
        const payload = {
          password: this.password_new,
          username: this.username_new,
          first_name: this.firstName_new,
          last_name: this.lastName_new,
          facility: this.facility,
        };
        this.updateUser(this.userid, payload, this.role_new);
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
