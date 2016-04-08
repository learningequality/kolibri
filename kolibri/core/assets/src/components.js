'use strict';
var logging = require('loglevel');
var Mn = require('backbone.marionette');
var _ = require('lodash');

logging.setDefaultLevel(2);

logging.info('Component views loaded!');


var TextInputField = Mn.ItemView.extend({
    template: function(seralized_model) {
        var template_html;
        if (this.model.get('enabled')) {
            template_html = '<input type="search" placeholder="Search here!">';
        } else {
            template_html = '<input type="search" disabled placeholder="Search here!">';
        }
        return _.template(template_html);
    },

    initialize: function() {
        _.bindAll(this, 'template');
    }
});

var TagList = Mn.CollectionView.extend({});


module.exports = {
    TextInputField: TextInputField,
    TagList: TagList
};
