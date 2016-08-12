<template>

  <div class="user-edit-modal">
    <modal btntext="Edit">
      <div class="title" slot="header">User edit</div>
      <div slot="body">
        <br>Username: <input type="text" v-model="username_new" placeholder="Please type in your username."><br>
        <br>Password: <input type="text" v-model="password_new" placeholder="Please type in your password."><br>
        <br>Full name: <input type="text" v-model="fullName_new" placeholder="Please type in your first name."><br>
        <!-- radio buttons for selecting role -->
        <br>Learner <input type="radio" value="learner" v-model="role_new"><br>
        <br>Admin <input type="radio" value="admin" v-model="role_new"><br>
      </div>
      <div slot="footer">
        <button class="confirm-btn" type="button" @click="editUser">Confirm</button>
      </div>
      <div slot="openbtn">
        <svg class="manage-edit" src="../icons/pencil.svg"></svg>
      </div>
    </modal>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      modal: require('../modal'),
    },
    props: [
      'userid', 'username', 'fullname', 'roles',
    ],
    data() {
      return {
        username_new: this.username,
        password_new: '',
        fullName_new: this.fullname,
        role_new: this.roles.length ? this.roles[0].kind : 'learner',
      };
    },
    methods: {
      editUser() {
        const payload = {
          username: this.username_new,
          full_name: this.fullName_new,
          facility: this.facility,
        };
        if (this.password_new) {
          payload.password = this.password_new;
        }
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

  @require '~core-theme.styl'

  .title
    display: inline

  .confirm-btn
    float: right

  .open-btn
    background-color: $core-bg-light

  .manage-edit
    fill: $core-action-normal
    cursor: pointer

</style>
