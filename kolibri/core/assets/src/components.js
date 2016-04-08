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

/*
Tag is an implementation detail -- not exposed directly, but rather used in TagList.
 */
var Tag = Mn.ItemView.extend({
    template: _.template('<span><%= name %></span>'),

    // The triggers hash converts DOM events into Backbone events
    triggers: {
        'click span': 'tagClicked'
    }
});

var TagList = Mn.CollectionView.extend({
    childView: Tag,

    childEvents: {
        tagClicked: 'onChildTagClicked'
    },

    onChildTagClicked: function(child, args) {
        this.trigger('tag_list:tag_clicked', child.model.get('name'));
    }
});


module.exports = {
    TextInputField: TextInputField,
    TagList: TagList
};
