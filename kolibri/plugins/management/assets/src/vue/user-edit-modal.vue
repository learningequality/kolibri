<template>

  <div class="user-edit-modal">
    <modal btntext="Edit">
      <div class="title" slot="header">User edit</div>
      <div slot="body">
        <br>Username: <input type="text" v-model="userName" placeholder="Please type in your username."><br>
        <br>Password: <input type="text" v-model="passWord" placeholder="Please type in your password."><br>
        <br>First name: <input type="text" v-model="firstName" placeholder="Please type in your first name."><br>
        <br>Last name: <input type="text" v-model="lastName" placeholder="Please type in your last name."><br>
        <!-- radio buttons for electing role -->
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
      'currid', 'currname', 'currfirstname', 'currlastname', 'currpassword', 'currrole',
    ],
    data() {
      return {
        userName: this.currname,
        passWord: '',
        firstName: this.currfirstname,
        lastName: this.currlastname,
        role: this.currrole,
      };
    },
    methods: {
      editUser() {
        const payload = {
          password: this.passWord,
          username: this.userName,
          first_name: this.firstName,
          last_name: this.lastName,
          facility: this.facility,
        };
        this.updateUser(this.currid, payload, this.role);
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