<template>

  <div class="device-owner-creation">
    <div class="wrapper" role="main">
      <img class="logo" src="./icons/logo-min.png" alt="Kolibri logo">
      <div class="container">
        <h1>Create Kolibri Device Owner and Facility</h1>
        <h2 class="title">Device Owner</h2>
        <div class="description">To use Kolibri, you first need to create a Device Owner account. This account will be used to configure high-level settings for this installation, and create other administrator accounts.</div>
        <div class="creation-form">
          <br><input :class="{ 'input-error': username_error }" type="text" v-model="username" placeholder="Username" aria-label="Username"><br>
          <br><input :class="{ 'input-error': password_error }" type="password" v-model="password" placeholder="Password" aria-label="Password"><br>
          <br><input :class="{ 'input-error': password_error }" type="password" v-model="confirm_password" placeholder="Confirm password" aria-label="Password"><br>
          <p class="error-message" v-if="password_error">{{ errormessage }}</p>
        </div>
        <br>
        <h2 class="title">Facility</h2>
        <div class="description">You also need to create a Facility, which represents your school, training center, or other location where this installation will be used.</div>
        <br><input :class="{ 'input-error': facility_error }" type="text" v-model="facility" placeholder="Facility name" aria-label="Facility name"><br>
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
        confirm_password: '',
        password_error: false,
        facility: '',
        facility_error: false,
        errormessage: '',
      };
    },
    methods: {
      createBoth() {
        if (this.username && this.password && this.facility
          && this.password === this.confirm_password) {
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
          this.facility_error = !this.facility;
          if (!this.password && !this.confirm_password) {
            this.password_error = true;
            this.errormessage = 'Password cannot be empty!';
          } else if (this.password !== this.confirm_password) {
            this.password_error = true;
            this.errormessage = 'Password does not match the confirm password!';
          } else {
            this.password_error = false;
          }
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
  h1
    font-size: 18px
  h2.title
    font-size: 14px
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
  .error-message
    color: $core-text-alert
  .logo
    height: 20%
    max-height: 160px
    min-height: 100px
    display: block
    margin-left: auto
    margin-right: auto

</style>
