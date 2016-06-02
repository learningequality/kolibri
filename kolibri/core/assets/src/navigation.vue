<template>

  <header role="banner">
    <nav class="titlebar" aria-label="Main navigation">

      <div>
        <span>{{title_bar.title}}</span>
        <a href="{{title_bar.home_link}}">Home</a>
      </div>

      <div>
        <button class="user-menu-btn" v-on:click="userNavDisplayToggle">{{user.first_name}}</span>
        <!-- Why was the above a "span" element? If it is a button as I suspect, let's just use the proper semantic element and style it accordingly! -->
        <div class="user-menu-popup" v-show="userNavDisplay">
          <ul aria-label="User options">
            <li v-for="item in user_nav_items">
              <a href="{{item.url}}">{{item.text}}</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <nav class="navlinks" aria-label="Content navigation">
      <div class="navlinks-item" v-for="item in nav_items">
        <a href="{{item.url}}">{{ item.text }}</a>
      </div>
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
        userNavDisplay: false,

        // items that go into the user menu
        user_nav_items: window._nav ? window._nav.user_nav_items || [] : [],
        user: {
          username: 'foobar',
          first_name: 'Foo',
          last_name: 'Bar',
        },
      };
    },
    methods: {
      userNavDisplayToggle() {
        this.userNavDisplay = !this.userNavDisplay;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'


  header
    background-color: $core-bg-light

  .titlebar
    display: flex
    justify-content: space-between
    padding: 10px

  .user-menu-btn
    cursor: pointer

  .user-menu-popup
    text-align: right
    position: absolute
    top: 2em
    right: 1em
    box-shadow: 2px 2px 3px $core-text-default
    background-color: $core-bg-light

    ul
      padding: 3px
      list-style: none

  .navlinks
    display: flex

  .navlinks-item
    margin: 0 0.5em

</style>
