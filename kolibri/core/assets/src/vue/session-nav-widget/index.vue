<template>

  <nav-bar-item @click="trigger()">
    <div class="wrapper">
      <div v-if="loggedIn" class='user-icon'>{{ displayText }}</div>
      <div v-else>
        <svg role="presentation" height="40" width="40" viewbox="0 0 24 24" src="./person.svg"></svg>
        <div class="label">Log In</div>
      </div>
    </div>
  </nav-bar-item>

</template>


<script>

  const UserKinds = require('../../constants').UserKinds;
  const actions = require('../../actions');

  module.exports = {
    components: {
      'nav-bar-item': require('nav-bar-item'),
    },
    computed: {
      displayText() {
        if (this.fullname) {
          return this.fullname[0].toUpperCase();
        }
        return '?';
      },
    },
    methods: {
      trigger() {
        if (this.loggedIn) {
          this.logOut();
        } else {
          this.logIn();
        }
      },
    },
    vuex: {
      actions: {
        logIn: actions.logIn,
        logOut: actions.logOut,
      },
      getters: {
        loggedIn: state => state.core.session.kind !== UserKinds.ANONYMOUS,
        fullname: state => state.core.session.fullname,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
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

    @media screen and (max-width: $portrait-breakpoint)
      font-size: 20px
      height: $size-sm
      width: $size-sm
      line-height: $size-sm - 2 * $border // vertically center

</style>
