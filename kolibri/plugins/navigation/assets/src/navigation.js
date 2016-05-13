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

            // items that go into the user menu
            user_nav_items: global.kolibri_reserved.user_nav_items,
            user: {
                username: 'foobar',
                first_name: 'Foo',
                last_name: 'Bar'
            }
        }
    });

    console.log(nav.nav_items);
};
