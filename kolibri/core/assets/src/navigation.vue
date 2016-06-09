<template>
  <header role="banner">
    <nav class="titlebar" role="navigation" aria-label="Main navigation">
      <ul aria-label="User options submenu">
        <li v-for="item in nav_items">
          <a href="{{item.url}}">{{item.text}}</a>
        </li>
      </ul>
    </nav>
    </header>
</template>


<script>

  module.exports = {
    data() {
      return {
        // items that go in the title bar
        nav_items: window._nav ? window._nav.nav_items || [] : [],
        title_bar: {
          title: 'Kolibri',
          home_link: '/',
        },
      };
    },
    methods: {
    },
  };

</script>


<style lang="stylus" scoped>
</style>
