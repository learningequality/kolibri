<template>

  <div class="device-owner-creation">
    <div class="wrapper" role="main">
      <img class="logo" src="./icons/logo-min.png" alt="Kolibri logo">
      <div class="container">
        <h1>{{ $tr('header') }}</h1>
        <h2 class="title">{{ $tr('deviceOwner') }}</h2>
        <div class="description">{{ $tr('deviceOwnerDescription') }}</div>
        <div class="creation-form">
          <p class="error-message" role="alert" aria-atomic="true">{{ errormessage }}</p>
          <label for="nameinput" class="inputlabel">{{ $tr('username') }}:</label>
          <input id="nameinput" :class="{ 'input-error': username_error }" type="text" v-model="username">
          <label for="passwordinput" class="inputlabel">{{ $tr('password') }}:</label>
          <input id="passwordinput" :class="{ 'input-error': password_error }" type="password" v-model="password">
          <label for="confirminput" class="inputlabel">{{ $tr('confirmPassword') }}:</label>
          <input id="confirminput" :class="{ 'input-error': password_error }" type="password" v-model="confirm_password">
        </div>
        <h2 class="title">{{ $tr('facility') }}</h2>
        <div class="description">{{ $tr('facilityDescription') }}</div>
        <label for="facilityinput" class="inputlabel">{{ $tr('facilityName') }}:</label>
        <input id="facilityinput" :class="{ 'input-error': facility_error }" type="text" v-model="facility">
        <br>
        <br>
        <br>
        <div class="btn-wrapper">
          <button class="create-btn" type="button" @click="createBoth">{{ $tr('getStarted') }}</button>
        </div>
      </div>
      <br>
    </div>
  </div>

</template>


<script>

  const actions = require('../actions');
  const store = require('../state/store');

  module.exports = {
    $trNameSpace: 'setupWizard',
    $trs: {
      header: 'Create Device Owner and Facility',
      deviceOwner: 'Device Owner',
      deviceOwnerDescription: 'To use Kolibri, you first need to create a Device Owner account. This account will be used to configure high-level settings for this installation, and create other administrator accounts.', // eslint-disable-line max-len
      username: 'Username',
      password: 'Password',
      confirmPassword: 'Confirm password',
      facility: 'Facility',
      facilityDescription: 'You also need to create a Facility, which represents your school, training center, or other location where this installation will be used.', // eslint-disable-line max-len
      facilityName: 'Facility name',
      getStarted: 'Create and get started',
    },
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
            this.errormessage = '';
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
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri/styles/coreTheme'

  .device-owner-creation
    position: absolute
    overflow-y: scroll
    width: 100%
    height: 100%
  .wrapper
    position: absolute
    max-height: 100%
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
  .container
    background: #fff
    width: 100%
    max-width: 430px
    min-width: 320px
    border-radius: $radius
    margin: 0 auto
    padding: 20px 30px
  h1
    font-size: 18px
  h2.title
    font-size: 14px
    font-weight: bold
  .inputlabel
    font-size: 14px
    color: $core-action-normal
    margin-top: 8px
    margin-bottom: 4px
    display: inline-block
  .description
    font-size: 12px
    color: $core-text-annotation
  .btn-wrapper
    width: 100%
    text-align: center
  .create-btn
    background-color: $core-action-normal
    color: white
  input
    width: 100%
    border-width: 2px
    border-style: solid
    border-color: $core-bg-canvas
    border-radius: $radius
    padding: 6px
    background-color: $core-bg-canvas
    border-color: $core-action-light
  input:focus
    background-color: #DAEFE5
  .input-error
    border-width: 2px
    border-color: $core-text-alert
    background-color: $core-text-alert-bg
  .error-message
    color: $core-text-alert
  .logo
    height: 40%
    width: 40%
    max-height: 160px
    min-height: 100px
    max-width: 160px
    min-width: 100px
    display: block
    margin-left: auto
    margin-right: auto

</style>
