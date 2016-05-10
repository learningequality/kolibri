'use strict';

var Vue = require('vue');

var Navigation = Vue.extend({

});

window.onload = function(){
    var nav = new Navigation({
        el: '#navigation-module',
        data: {
            nav_items: global.kolibri_reserved.nav_items,
            user_nav_items: global.kolibri_reserved.user_nav_items,
            user: {
                username: 'foobar',
                first_name: 'Foo',
                last_name: 'Bar'
            }
        }
    });
};
