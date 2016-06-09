<template>
  <header role="banner">
    <nav class="titlebar" role="navigation" aria-label="Main navigation">
      <ul aria-label="User options submenu">
        <li v-for="(url, label) in nav_items">
            <a :style="{fontWeight: url == app ? 'bold' : ''}" :href=" '/' + url">
              {{label}}
            </a>
        </li>
      </ul>
    </nav>
    </header>
</template>


<script>
  /* global _navItems window*/

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
</style>
