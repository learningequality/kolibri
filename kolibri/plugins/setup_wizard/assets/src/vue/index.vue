<template>

  <div class="device-owner-creation">
    <div class="wrapper">
      <img class="logo" src="./icons/logo-min.png">
      <div class="container">
        <div class="title">Device Owner</div>
        <br>
        <div class="description">To use Kolibri, you first need to create a Device Owner account. This account will be used to configure high-level settings for this installation, and create other administrator accounts.</div>
        <div class="creation-form">
          <br><input :class="{ 'input-error': username_error }" type="text" v-model="username" placeholder="Username"><br>
          <br><input :class="{ 'input-error': password_error }" type="text" v-model="password" placeholder="Password"><br>
        </div>
        <br>
        <div class="title">Facility</div>
        <br>
        <div class="description">You also need to create a Facility, which represents your school, training center, or other location where this installation will be used.</div>
        <br><input :class="{ 'input-error': facility_error }" type="text" v-model="facility" placeholder="Facility name"><br>
        <br>
        <br>
        <button class="create-btn" type="button" @click="createBoth">Create and get started</button>
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
        username_error: false,
        password: '',
        password_error: false,
        facility: '',
        facility_error: false,
      };
    },
    methods: {
      createBoth() {
        if (this.username && this.password && this.facility) {
          const deviceOwnerPayload = {
            password: this.password,
            username: this.username,
          };
          const facilityPayload = {
            name: this.facility,
          };
          this.createDeviceOwnerAndFacility(deviceOwnerPayload, facilityPayload);
        } else {
          this.username_error = !this.username;
          this.password_error = !this.password;
          this.facility_error = !this.facility;
        }
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
    width: 100%
    max-width: 430px
    min-width: 320px
    border-radius: 4px
    margin: 0 auto
    padding: 20px 30px
  .title
    font-weight: bold
  .description
    font-size: 12px
    color: $core-text-annotation
  .create-btn
    background-color: $core-action-normal
    color: white
  input
    width: 100%
    border-width: 2px
    border-style: solid
    border-color: $core-bg-canvas
    border-radius: 4px
    padding: 6px
    background-color: $core-bg-canvas
  .input-error
    border-width: 2px
    border-color: $core-text-alert
    background-color: $core-text-alert-bg
  .logo
    height: 20%
    max-height: 160px
    min-height: 100px
    display: block
    margin-left: auto
    margin-right: auto

</style>
