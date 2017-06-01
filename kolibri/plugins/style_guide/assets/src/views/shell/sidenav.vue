<template>

  <nav class="sidenav">

    <template v-for="menuSection in navigationMenu">
      <h1>{{ menuSection.sectionHeading }}</h1>
      <ul>
        <li v-for="sectionLink in menuSection.sectionLinks">
          <router-link :to="sectionLink.linkRoute">
            {{ sectionLink.linkLabel }}
          </router-link>
        </li>
      </ul>
    </template>

  </nav>

</template>


<script>
  const {navigationMenu} = require('./navigation-menu.js');

  module.exports = {
    data() {
      return {
        navigationMenu
      }
    }
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .sidenav
    border-right: 1px solid black;

</style>
