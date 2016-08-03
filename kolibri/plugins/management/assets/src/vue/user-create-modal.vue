<template>

  <div class="user-creation-modal">
    <modal btntext="Add New">
      <div class="title" slot="header">User creation</div>
      <div slot="body">
        <br>Username: <input type="text" v-model="username" placeholder="Please type in your username."><br>
        <br>Password: <input type="text" v-model="password" placeholder="Please type in your password."><br>
        <br>First name: <input type="text" v-model="firstName" placeholder="Please type in your first name."><br>
        <br>Last name: <input type="text" v-model="lastName" placeholder="Please type in your last name."><br>
        <!-- radio buttons for selecting role -->
        <br>Learner <input type="radio" value="learner" v-model="role"><br>
        <br>Admin <input type="radio" value="admin" v-model="role"><br>
      </div>
      <div slot="footer">
        <button class="create-btn" type="button" @click="createNewUser">Create User</button>
      </div>
      <div slot="openbtn">
        <div class="manage-create">
          <div class="add-text" src="">Add New</div>
          <svg class="add-user" src="./icons/add_new_user.svg"></svg> 
        </div>
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
    data() {
      return {
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'learner',
      };
    },
    methods: {
      createNewUser() {
        const payload = {
          password: this.password,
          username: this.username,
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

  .title
    display: inline

  .create-btn
    float: right
    
  .manage-create
    background-color: #996189
    border-radius: 5px
    color: #f9f9f9
    float: right
    height: 25px
    width: 130px
    font-size: 12px
    text-indent: 50px
    cursor: pointer
  
  .add-user
    float: left
    height: 80%
    width: 30%

  .add-text
    float: left
    position: absolute
    padding: 3px

</style>

