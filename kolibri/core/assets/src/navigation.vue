<template>
  <nav class="titlebar" role="navigation" aria-label="Main navigation">
    <ul aria-label="User options submenu">
      <li v-for="(url, label) in nav_items">
          <a :style="{fontWeight: url == app ? 'bold' : ''}" :href=" '/' + url">
            {{label}}
          </a>
      </li>
    </ul>
  </nav>
</template>


<script>
  /* global _navItems window */

  module.exports = {
    data() {
      return {
        // items that go in the title bar
        nav_items: _navItems || [],
        // the current app on
        app: window.location.pathname.split('/')[1],
      };
    },
    methods: {
    },
  };

</script>


<style lang="stylus" scoped>
  /**
    * Core Themes Variables:
    * + $nav-width
    */

  $nav-item-height = 10%
  nav
    height: 100%
    width: $nav-width
    position: fixed
    top: 0

  ul
    height: 100%
    display: block
    line-height: $nav-item-height / 2

  li
    height: $nav-item-height
    display: inline block
    vertical-align: middle
</style>
