<template>

  <div class="user-dropdown">
    <ul class="dropdown-list">
      <li>
        <h4 v-el: id="dropdown-name">Name Field</h4>
        <p id="dropdown-username">username</p>
        <p id="dropdown-usertype">user type</p>
      </li>
      <li id="logout-tab">
        <div @click="logout">
          <img src="./icons/logout.svg">
          <span>Logout</span>
        </div>
      </li>
    </ul>
  </div>

</template>


<script>

  const actions = require('../actions');

  module.exports = {

    props: [
      'loggedInUsername',
      'first_name',
      'roles',
    ],
    vuex: {
      getters: {
        loggedInUsername: state => state.loggedInUsername,
        facility: state => state.facility,
        getUsers: state => state.users,
      },
      actions: {
        logout: actions.logout,
      },
    },

  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  
  .user-dropdown
    box-shadow: 1px 1px 4px #e3e3e3
    border-radius: $radius
    position: relative
    top: 20px
    left: 50px
    max-width: 300px
    background: $core-bg-light
  	
  .dropdown-list
    list-style: none
    padding: 0
    li
      padding: 1px 20px
    &:before, &:after
      content: ' '
      height: 0
      width: 0
      position: absolute
    &:before
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
    margin-bottom: 0
      
  #dropdown-username
    margin: 0
    color: $core-text-annotation
    
  #dropdown-usertype
    text-transform: uppercase
    color: $core-text-annotation
    font-size: 12px

  #logout-tab
    padding: 20px
    border-top: 0.5px solid #aaa
    div
      color: $core-text-default
      &:hover
        color: $core-action-normal
        img
          fill: $core-action-normal

</style>