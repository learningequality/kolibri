<template>

  <div class="device-owner-creation">
    <div class="wrapper" role="main">
      <img class="logo" src="./icons/logo-min.png" alt="Kolibri logo">
      <div class="container">
        <h1>{{ $tr('header') }}</h1>
        <h2 class="title">{{ $tr('deviceOwner') }}</h2>
        <div class="description">{{ $tr('deviceOwnerDescription') }}</div>
        <div class="creation-form">
          <br><input :class="{ 'input-error': username_error }" type="text" v-model="username" :placeholder="$tr('username')" :aria-label="$tr('username')"><br>
          <br><input :class="{ 'input-error': password_error }" type="password" v-model="password" :placeholder="$tr('password')" :aria-label="$tr('password')"><br>
          <br><input :class="{ 'input-error': password_error }" type="password" v-model="confirm_password" :placeholder="$tr('confirmPassword')" :aria-label="$tr('confirmPassword')">
          <p class="error-message">{{ errormessage }}</p>
        </div>
        <h2 class="title">{{ $tr('facility') }}</h2>
        <div class="description">{{ $tr('facilityDescription') }}</div>
        <br><input :class="{ 'input-error': facility_error }" type="text" v-model="facility" :placeholder="$tr('facilityName')" :aria-label="$tr('facilityName')"><br>
        <br>
        <br>
        <div class="btn-wrapper">
          <button class="create-btn" type="button" @click="createBoth">{{ $tr('getStarted') }}</button>
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  const actions = require('../actions');
  const store = require('../state/store');

  module.exports = {
    $trNameSpace: 'setupWizard',
    $trs: {
      header: 'Create Kolibri Device Owner and Facility',
      deviceOwner: 'Recommended',
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

  @require '~core-theme.styl'

  .device-owner-creation
    position: fixed
    top: 0
    left: 0
    width: 100%
    height: 100%
    display: table
  .wrapper
    overflow-y: scroll
    display: table-cell
    vertical-align: middle
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
