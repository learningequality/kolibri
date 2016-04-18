'use strict';
var logging = require('loglevel');
var Mn = require('backbone.marionette');
var _ = require('lodash');

logging.setDefaultLevel(2);

logging.info('Component views loaded!');


var AbstractTextInput = Mn.ItemView.extend({
    template: function(serialized_model) {
        var template_html;
        if (this.model.get('enabled')) {
            template_html = '<input type="' + this.input_tag_type + '" placeholder="Search here!">';
        } else {
            template_html = '<input type="' + this.input_tag_type + '" disabled placeholder="Search here!">';
        }
        return _.template(template_html);
    },

    className: 'textInput',

    initialize: function() {
        _.bindAll(this, 'template');
    },

    triggers: {
        'change input': 'inputChanged'
    },

    onInputChanged: function(){
        this.trigger('text_input:text_changed', this.$el.find('input').val());
    },

    clear: function() {
        this.$el.find('input').val('');
    },

    toggleEnabled: function() {
        this.model.set('enabled', !this.model.get('enabled'));
    }
});


var TextLineInput = AbstractTextInput.extend({
    input_tag_type: 'search'
});


var TextAreaInput = AbstractTextInput.extend({
    template: function(serialized_model) {
        var template_html;
        if (this.model.get('enabled')) {
            template_html = '<textarea placeholder="Write here!">';
        } else {
            template_html = '<textarea disabled placeholder="Write here!">';
        }
        return _.template(template_html);
    },

    triggers: {
        'change textarea': 'inputChanged'
    },

    onInputChanged: function(){
        this.trigger('text_input:text_changed', this.$el.find('textarea').val());
    }
});


var PasswordInput = AbstractTextInput.extend({
    input_tag_type: 'password'
});


var ValidatingTextInput = AbstractTextInput.extend({
    input_tag_type: 'search'
});


/*
Tag is an implementation detail -- not exposed directly, but rather used in TagList.
 */
var Tag = Mn.ItemView.extend({
    template: _.template('<span><%= name %></span>'),

    tagName: 'li',

    className: 'tag',

    // The triggers hash converts DOM events into Backbone events
    triggers: {
        'click span': 'tagClicked'
    }
});


// Implements CRUD actions for a given item
var CrudItem = Mn.ItemView.extend({
    template: function(serialized_model) {
        var html = '';
        _.forEach(this.display, function(key) {
            html += '<span>' + key + ': ' + serialized_model[key] + '</span>';
        });
        html += '<button class="delete standard-button">Delete</button>';
        return _.template(html);
    },

    tagName: 'li',

    className: 'crudItem',

    triggers: {
        'click .delete': 'itemDeleted'
    },

    initialize: function(options) {
        this.display = options.display || _.keys(this.model.attributes);
        _.bindAll(this, 'template');
    }
});


var CrudCollection = Mn.CollectionView.extend({
    childView: CrudItem,

    childViewOptions: function() {
        return {
            display: this.display
        };
    },

    initialize: function(options) {
        this.display = options.display || false;
    },

    tagName: 'ul',

    className: 'ko_list',

    childEvents: {
        itemDeleted: 'onChildItemDeleted'
    },

    onChildItemDeleted: function(child, args) {
        this.collection.remove(child.model);
    }
});


var KolibriCrudView = Mn.LayoutView.extend({
    template: _.template('<div class="collectionRegion"></div>' +
                         '<button class="add">Add</button>'),

    regions: {
        collectionRegion: '.collectionRegion'
    },

    events: {
        'click .add': 'onAddClicked'
    },

    initialize: function(options) {
        this.collectionView = new CrudCollection({
            collection: options.collection,
            display: options.display || false
        });
    },

    onBeforeShow: function() {
        this.showChildView('collectionRegion', this.collectionView);
    },

    onAddClicked: function() {
        console.log('Add clicked!');
    }
});


var TagList = Mn.CollectionView.extend({
    childView: Tag,

    tagName: 'ul',

    className: 'tagList',

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
    TagList: TagList,
    KolibriCrudView: KolibriCrudView
};
