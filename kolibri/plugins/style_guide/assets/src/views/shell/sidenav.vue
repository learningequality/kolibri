<template>

  <nav class="sidenav">

    <template v-for="menuSection in navigationMenu">
      <h2>{{ menuSection.sectionHeading }}</h2>
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

  const { navigationMenu } = require('./navigation-menu.js');

  module.exports = {
    data() {
      return {
        navigationMenu
      };
    }
  };

</script>


<style lang="stylus" scoped>

  .sidenav
    border-right: 1px solid #e0e0e0
    padding-left: 2em
    background: #f7f7f7

    h2
      margin-top: 1.2em
      margin-bottom: 0

    ul
      list-style-type: none
      padding-left: 0
      margin-top: 0.5em

      li
        padding: 0.2em 0

        a
          text-decoration: none

          &.router-link-active
            font-weight: bold

</style>
