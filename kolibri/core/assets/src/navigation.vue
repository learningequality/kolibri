<template>

  <header id="navigation-module">
    <nav class="titlebar">

      <div class="titlebar_left">
        <span class="titlebar_title">{{title_bar.title}}</span>
        <a class="titlebar_homelink" href="{{title_bar.home_link}}">Home</a>
      </div>

      <div class="titlebar_right">
        <span v-on:click="user_nav_display_toggle">{{user.first_name}}</span>
        <div class="usermenu" v-bind:style="{display: user_nav_display}">
          <ul>
            <li v-for="item in user_nav_items">
              <a href={{item.url}}>{{item.text}}</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <nav class="navlinks">
      <div class="navlinks_item" v-for="item in nav_items">
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
        user_nav_display: 'none',

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
      user_nav_display_toggle() {
        if (this.user_nav_display === 'none') {
          this.user_nav_display = 'block';
        } else {
          this.user_nav_display = 'none';
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~theme.styl'

  .titlebar
    background-color: $bg-canvas
    color: white

    // fix for the div float issue
    overflow: auto
    padding: 1 em
    width: 100%

    &_left
      float: left
      width:70%
    &_right
      float: right
      width: 30%
      span
        float: right

  .navlinks
    box-sizing: border-box
    overflow: auto
    width: 90%
    margin: 0 5%
    padding-top: 0.5em
    border-bottom: 1px solid $text-default
    &_item
      float:left
      padding: 0 0.5em
      font-size: 1.5em
      a
        text-decoration: none
        color: $text-default

  .usermenu
    position:absolute
    top: 2em
    right: 1em
    box-shadow: 2px 2px 3px $text-default
    background-color: white
    ul
      padding: 3px
      list-style: none
    a
      color: $text-default
      text-decoration: none

</style>
