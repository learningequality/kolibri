<template>

  <div class="device-owner-creation">
    <div class="wrapper">
      <div class="container">
        <div class="title">Device Owner Creation</div>
        <div class="creation-form">
          <br>Username: <input type="text" v-model="username" placeholder="Please type in your username."><br>
          <br>Password: <input type="text" v-model="password" placeholder="Please type in your password."><br>
        </div>
        <button class="create-btn" type="button" @click="createTheDeviceOwner">Create</button>
      </div>
    </div>
  </div>

</template>


<script>

  const actions = require('../actions');

  module.exports = {
    data() {
      return {
        username: '',
        password: '',
      };
    },
    methods: {
      createTheDeviceOwner() {
        const payload = {
          password: this.password,
          username: this.username,
        };
        this.createDeviceOwner(payload);
      },
    },
    vuex: {
      actions: {
        createDeviceOwner: actions.createSuperuser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  
  .device-owner-creation
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    background: rgba(0, 0, 0, 0.7)
    display: table
  
  .wrapper
    display: table-cell
    vertical-align: middle

  .container
    background: #fff
    width: 450px
    border-radius: 4px
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33)
    margin: 0 auto
    padding: 20px 30px

</style>
