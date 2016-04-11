'use strict';
var logging = require('loglevel');
var Mn = require('backbone.marionette');
var _ = require('lodash');

logging.setDefaultLevel(2);

logging.info('Component views loaded!');


var AbstractTextInput = Mn.ItemView.extend({
    template: function(serialized_model) {
        return _.template('<div>foo</div>');
    },

    initialize: function() {
        _.bindAll(this, 'template');
    },

    triggers: {
        'change input': 'inputChanged'
    },

    onInputChanged: function(args) {
        this.trigger('text_input_field:text_changed', args.view.$el.find('input').val());
    },

    clear: function() {
        this.$el.find('input').val('');
    }
});


var TextLineInput = AbstractTextInput.extend({
    template: function(serialized_model) {
        var template_html;
        if (this.model.get('enabled')) {
            template_html = '<input type="search" placeholder="Search here!">';
        } else {
            template_html = '<input type="search" disabled placeholder="Search here!">';
        }
        return _.template(template_html);
    }
});


var TextAreaInput = AbstractTextInput.extend({});


var PasswordInput = AbstractTextInput.extend({});


var ValidatingTextInput = AbstractTextInput.extend({});


/*
Tag is an implementation detail -- not exposed directly, but rather used in TagList.
 */
var Tag = Mn.ItemView.extend({
    template: _.template('<span class="tag"><%= name %></span>'),

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
    TextLineInput: TextLineInput,
    TextAreaInput: TextAreaInput,
    PasswordInput: PasswordInput,
    ValidatingTextInput: ValidatingTextInput,
    TagList: TagList
};
