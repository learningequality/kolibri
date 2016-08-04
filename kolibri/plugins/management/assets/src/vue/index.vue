<template>

  <core-base>
    <button @click="showUserDropdown">Show user dropdown</button>
    <button @click="hideUserDropdown">Hide user dropdown</button>
    <user-dropdown v-show="showDropdown"></user-dropdown>
    <login-modal></login-modal>
    <user-roster></user-roster>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'user-roster': require('./user-roster.vue'),
      'login-modal': require('./login-modal.vue'),
      'user-dropdown': require('./user-dropdown.vue'),
    },
    data: () => ({
      showDropdown: false,
    }),
    methods: {
      showUserDropdown() {
        this.showDropdown = true;
      },
      hideUserDropdown() {
        this.showDropdown = false;
      },
    },
    vuex: {
      actions: require('../actions.js'),
    },
  };

</script>


<style lang="stylus" scoped></style>
