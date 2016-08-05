<template>

  <div class="device-owner-creation">
    <div class="wrapper">
      <div class="container">
        <div class="title">Device Owner Creation</div>
        <div class="creation-form">
          <br>Username: <input type="text" v-model="username" placeholder="Example: Dylan Barth"><br>
          <br>Password: <input type="text" v-model="password" placeholder="Example: 1212"><br>
        </div>
        <br>
        <div class="title">Facility Creation</div>
        <br>Facility: <input type="text" v-model="facility" placeholder="Example: San Diego High School"><br>
        <br>
        <button class="create-btn" type="button" @click="createBoth">Create</button>
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
        facility: '',
      };
    },
    methods: {
      createBoth() {
        const deviceOwnerPayload = {
          password: this.password,
          username: this.username,
        };
        const facilityPayload = {
          name: this.facility,
        };
        this.createDeviceOwnerAndFacility(deviceOwnerPayload, facilityPayload);
      },
    },
    vuex: {
      actions: {
        createDeviceOwnerAndFacility: actions.createDeviceOwnerAndFacility,
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
    display: table
  
  .wrapper
    display: table-cell
    vertical-align: middle

  .container
    background: #fff
    width: 450px
    border-radius: 4px
    margin: 0 auto
    padding: 20px 30px

</style>
