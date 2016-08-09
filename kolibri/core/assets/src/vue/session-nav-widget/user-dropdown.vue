<template>

  <div v-show="showDropDown" class="user-dropdown">
    <ul class="dropdown-list">
      <li>
        <h4 v-el: id="dropdown-name">{{ fullname }}</h4>
        <p id="dropdown-username">{{ username }}</p>
        <p id="dropdown-usertype">{{ kind }}</p>
      </li>
      <li id="logout-tab">
        <div @click="logout">
          <span>Logout</span>
        </div>
      </li>
    </ul>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {

    data: () => ({
      showDropDown: true,
    }),
    methods: {
      logout() {
        this.logOut();
        this.showDropDown = false;
      },
    },
    vuex: {
      getters: {
        fullname: state => state.core.session.fullname,
        username: state => state.core.session.username,
        kind: state => state.core.session.kind,
      },
      actions: {
        logOut: actions.logOut,
      },
    },

  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .user-dropdown
    box-shadow: 1px 1px 4px #e3e3e3
    border-radius: $radius
    position: absolute
    top: -100px
    left: 100px
    width: 250px
    background: $core-bg-light
    text-align: left

  .dropdown-list
    list-style: none
    padding: 0
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

  #dropdown-name
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
      background: url('./active-logout.svg') no-repeat
      &:hover
        background: url('./logout-hover.svg') no-repeat
      span
        position: relative
        bottom: 2px
        margin-left: 25px
        &:hover
          cursor: pointer
          color: $core-action-dark

</style>
