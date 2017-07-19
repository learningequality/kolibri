<template>

  <div class="sidenav">
    <router-link :to="'/style_guide/'" class="sidenav-heading">
      <h1>Kolibri Style Guide</h1>
    </router-link>

    <nav class="sidenav-menu">
      <template v-for="menuSection in navigationMenu">
        <h2>{{ menuSection.sectionHeading }}</h2>
        <ul>
          <li v-for="sectionItem in menuSection.sectionLinks">
            <router-link :to="sectionItem.linkRoute">
              {{ sectionItem.linkLabel }}
            </router-link>
          </li>
        </ul>
      </template>
    </nav>
  </div>

</template>


<script>

  import { navigationMenu } from './navigation-menu.js';

  export default {
    data() {
      return {
        navigationMenu,
      };
    },
  };

</script>


<style lang="stylus" scoped>

  @import '../../styles/style-guide.styl'

  .sidenav
    border-right: 1px solid #e0e0e0
    background: #f7f7f7
    position: fixed
    top: 0
    bottom: 0
    left: 0
    overflow-y: auto
    width: $sidenav-width

  .sidenav-heading
    text-decoration: none
    display: block
    padding: 1em 2em
    h1
      font-size: 1.25em
      margin: 0


  .sidenav-menu
    h2
      padding-left: $nav-padding-left
      margin-top: 1.2em
      margin-bottom: 0

    ul
      list-style-type: none
      padding-left: 0
      margin-top: 0.5em

      li

        a
          padding: 12px $nav-padding-left
          text-decoration: none
          display: block

          &.router-link-active
            font-weight: bold
            background: #e4e4e4

</style>
