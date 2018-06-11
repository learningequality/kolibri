<template>

  <nav class="sidenav">
    <router-link :to="'/'" class="sidenav-heading">
      Kolibri Style Guide
    </router-link>

    <div>
      <template v-for="section in navMenu">
        <div class="section-heading" :key="`${section.sectionName}-heading`">
          {{ section.sectionName }}
        </div>
        <ul :key="`${section.sectionName}-ul`">
          <li v-for="sectionItem in section.sectionItems" :key="sectionItem.itemName">
            <router-link :to="sectionItem.itemRoute" class="link">
              {{ sectionItem.itemName }}
            </router-link>
          </li>
        </ul>
      </template>
    </div>
  </nav>

</template>


<script>

  import { navMenu } from './nav-menu.js';

  export default {
    name: 'sideNav',
    data() {
      return {
        navMenu,
      };
    },
  };

</script>


<style lang="stylus" scoped>

  @require '../../styles/style-guide.styl'

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
    padding: 32px 24px
    text-decoration: none
    font-size: 1.25em

  .section-heading
    font-weight: bold
    margin-right: 24px
    margin-left: 24px
    margin-top: 24px
    margin-bottom: 12px

  ul
    margin: 0
    padding: 0
    list-style-type: none

  .link
    display: block
    padding: 12px 24px
    text-decoration: none

    &.router-link-active
      font-weight: bold
      background-color: #E0E0E0

</style>
