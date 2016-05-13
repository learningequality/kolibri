'use strict';

require('./navigation_styles.styl');
var Vue = require('vue');

var Navigation = Vue.extend({

});

window.onload = function(){
    var nav = new Navigation({
        el: '#navigation-module',
        data: {
            // items that go in the title bar
            nav_items: global.kolibri_reserved.nav_items,
            title_bar: {
              title: 'Kolibri',
              home_link: '/'
            },
            user_nav_display: 'none',

            // items that go into the user menu
            user_nav_items: global.kolibri_reserved.user_nav_items,
            user: {
                username: 'foobar',
                first_name: 'Foo',
                last_name: 'Bar'
            }
        },
        methods: {
          user_nav_display_toggle: function(){
            if (this.user_nav_display === 'none'){
              this.user_nav_display = 'block';
            }else {
              this.user_nav_display = 'none';
            }
          },
        }
    });
};
