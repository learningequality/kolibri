<template>

  <div class="sidenav">
    <router-link :to="'/style_guide/'" class="sidenav-heading">
      <h1>Kolibri Style Guide</h1>
    </router-link>

    <nav class="sidenav-menu">
      <template v-for="section in navMenu">
        <h2>{{ section.sectionName }}</h2>
        <ul>
          <li v-for="sectionItem in section.sectionItems">
            <router-link :to="sectionItem.itemRoute">
              {{ sectionItem.itemName }}
            </router-link>
          </li>
        </ul>
      </template>
    </nav>
  </div>

</template>


<script>

  import { navMenu } from './nav-menu.js';

  export default {
    data() {
      return {
        navMenu,
      };
    },
  };

</script>


<style lang="stylus" scoped>

  @import '../../styles/style-guide.styl'

  .sidenav
    position: fixed
    top: 0
    bottom: 0
    left: 0
    overflow-y: auto
    width: $sidenav-width
    background: #F7F7F7
    border-right: 1px solid #e0e0e0

  .sidenav-heading
    display: block
    padding: 16px 24px
    text-decoration: none
    h1
      margin: 0
      font-size: 1.25em


  .sidenav-menu
    h2
      margin-right: 24px
      margin-left: 24px
      margin-top: 24px
      margin-bottom: 12px

    ul
      margin: 0
      padding: 0
      list-style-type: none

      li

        a
          display: block
          padding: 12px 24px
          text-decoration: none

          &.router-link-active
            font-weight: bold
            background-color: #E0E0E0

</style>
