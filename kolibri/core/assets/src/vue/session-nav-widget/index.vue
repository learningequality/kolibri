<template>

  <nav-bar-item>
    <div class="wrapper">
      <div v-if="loggedIn">
        <div class='user-icon' id="user-dropdown" @click="showUserDropdown">{{ displayText }}</div>
      </div>
      <div v-else>
        <login-modal></login-modal>
      </div>
    </div>
  </nav-bar-item>

  <nav-bar-item href="/learn/#!/learn">
    <div id="dropdown" v-show="showDropdown" transition="slide">
      <div class="user-dropdown">
        <ul class="dropdown-list">
          <li>
            <h4 v-if="deviceOwner" class="dropdown-name">Device Owner</h4>
            <h4 v-else class="dropdown-name">{{ fullname }}</h4>
            <p id="dropdown-username">{{ username }}</p>
            <p id="dropdown-usertype">{{ kind }}</p>
          </li>
          <li id="logout-tab">
            <div @click="userLogout">
              <span>Logout</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </nav-bar-item>

</template>


<script>

  const UserKinds = require('../../constants').UserKinds;
  const actions = require('../../core-actions');

  module.exports = {
    components: {
      'nav-bar-item': require('nav-bar-item'),
      'login-modal': require('./login-modal.vue'),
    },
    data: () => ({
      showDropdown: false,
    }),
    computed: {
      displayText() {
        if (this.fullname) {
          return this.fullname[0].toUpperCase();
        }
        if (this.deviceOwner) {
          return this.username[0].toUpperCase();
        }
        return '?';
      },
    },
    methods: {
      showUserDropdown() {
        if (this.showDropdown) {
          this.showDropdown = false;
        } else {
          this.showDropdown = true;
        }
      },
      // user-dropdown
      userLogout() {
        this.logout(this.Kolibri);
        this.showDropdown = false;
      },
    },
    vuex: {
      actions: {
        logout: actions.kolibriLogout,
      },
      getters: {
        loggedIn: state => state.core.session.kind !== UserKinds.ANONYMOUS,
        deviceOwner: state => state.core.session.kind === UserKinds.SUPERUSER,
        fullname: state => state.core.session.full_name,
        username: state => state.core.session.username,
        kind: state => state.core.session.kind,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~nav-bar-item.styl'

  $size-lg = 40px
  $size-sm = 30px
  $border = 2px

  .wrapper
    min-width: $size-lg

  .user-icon
    color: $core-action-normal
    font-size: 25px
    font-weight: bold

    border-radius: 50%
    height: $size-lg
    width: $size-lg
    line-height: $size-lg - 2 * $border // vertically center
    background-color: transparent
    border-width: $border
    border-style: solid
    border-color: $core-action-normal

  #user-dropdown
    display: block

  #dropdown
    position: absolute

  .slide-transition
    transition: all 0.25s ease
    left: 0

  .slide-enter, .slide-leave
    left: -300px

  .user-dropdown
    box-shadow: 1px 1px 4px #e3e3e3
    border-radius: $radius
    position: absolute
    top: -165px
    left: 100px
    width: 250px
    background: $core-bg-light
    text-align: left
    z-index: -1
    
  .dropdown-list
    list-style: none
    padding: 0
    margin: 0
    li
      padding: 1px 20px
    &:before, &:after
      // styling for left-facing arrow
      content: ' '
      height: 0
      width: 0
      position: absolute
    &:before
      // styling for the left-facing arrow
      border-bottom-color: $core-bg-light
      top: 20px
      left: -39px
      border-top: 15px solid transparent
      border-left: 20px solid transparent
      border-bottom: 15px solid transparent
      border-right: 20px solid $core-bg-light
      -webkit-filter: drop-shadow(-3px 0 2px #e3e3e3)

  .dropdown-name
    margin-top: 18px
    margin-bottom: 0 // html linting yelled at me for not being 'succinct' enough :(

  #dropdown-username
    margin: 0
    color: $core-text-annotation
    font-size: 14px
    font-style: italic

  #dropdown-usertype
    text-transform: uppercase
    color: $core-text-annotation
    font-size: 12px
    margin-top: 15px

  #logout-tab
    padding: 20px 20px 15px
    border-top: 0.5px solid #aaa
    div
      color: $core-action-normal
      transition: all 0.2s
      background: url('./icons/active-logout.svg') no-repeat
      &:hover
        background: url('./icons/logout-hover.svg') no-repeat
      span
        position: relative
        bottom: 2px
        margin-left: 25px
        &:hover
          cursor: pointer
          color: $core-action-dark

  @media screen and (max-width: $portrait-breakpoint)
    font-size: 20px
    height: $size-sm
    width: $size-sm
    line-height: $size-sm - 2 * $border // vertically center
    
  // Portrait mode for user dropdown (or drop-up in this case)
  @media screen and (max-width: $portrait-breakpoint)
    .dropdown-list:before
      border: none

    .user-dropdown
      box-shadow: -3px -3px 4px #e3e3e3
      border-radius: 0
      top: -147px
      left: auto
      right: 0
      text-align: right

    .slide-transition
      top: 0

    .slide-enter, .slide-leave
      top: 300px

    #dropdown
      right: 0
      
    .dropdown-name
      font-size: 16px

    #logout-tab
      div
        background-position: 135px 0
        &:hover
          background-position: 135px 0
      span
        font-size: 15px

</style>
