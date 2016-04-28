'use strict';
var $ = require('jquery');
var logging = require('loglevel');
var Backbone = require('backbone');
var Mn = require('backbone.marionette');
var _ = require('lodash');
var Handlebars = require('handlebars.runtime');

global.jQuery = $;
require('bootstrap-modal');


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
        var html =
            '{{#each display}}<span>{{ key }} {{ value }}</span>{{/each}}' +
            '<button class="delete standard-button">Delete</button>';
        return Handlebars.compile(html)({
            display: _.map(this.display, function(key) {
                return {
                    key: key,
                    value: serialized_model[key]
                };
            })
        });
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


var CrudAddItem = Mn.ItemView.extend({
    // Template should either be the html *or* (as it is here) be a *function* that returns the rendered html.
    // If it's a function, it's passed an object which is the "serialized" model of the view instance.
    // In other words, if the view instance is given a model attribute when instantiated, then the argument
    // to this function will be a copy of that model's .attributes hash.
    template: function() {
        var html =
            '{{#unless valid}}<span>Invalid Input!</span><br />{{/unless}}' +
            '{{#each create}}' +
                '<input data-attr="{{ name }}" type="text" placeholder="{{ name }}" value="{{ default }}" /><br />' +
            '{{/each}}' +
            '<button class="create flat-button">Create</button>';
        return Handlebars.compile(html)({create: this.create, valid: this.valid});
    },

    triggers: {
        // Re-triggers the specified DOM event (from its template) as a Backbone.Event on this view.
        'click .create': 'create'
    },

    initialize: function(options) {
        // Some options when passed to the constructor are automatically bound to the view instance.
        // This is the case for the "model" attribute, so passing a model to a view constructor means that the
        // instance has it available automatically as "this.model".
        // Custom options (like "create" below) must be bound to the view instance manually, or otherwise handled
        // by the initialize function.
        this.create = _.map(options.create, function(attr) {
            return {
                name: attr,
                default: ''
            };
        });
        this.validators = options.validators;
        this.valid = true;
        // Since "template" is a callback, bindAll ensures "this" refers the view instance.
        _.bindAll(this, 'template');
    },

    // For event "xyz", you can specify a handler without having to set up a listener using the camel-cased
    // "onXyz" convention.
    // E.g. "create" event is handled automatically by the "onCreate" function if it exists.
    onCreate: function() {
        if ( this.validate() ) {
            _.forEach(this.create, _.bind(function (obj) {
                var attr = obj.name;
                this.model.set(attr, this.getAttrVal(attr));
            }, this));
            this.collection.add(this.model);
            this.trigger('closeModal');
        } else {
            // Shows an "Invalid!" message.
            this.rerender = true;
            this.render();
        }
    },

    onBeforeRender: function() {
        // Before re-rendering, make sure that values user has already entered aren't trashed
        if (this.rerender) {
            var self = this;
            this.create = _.map(this.create, function(old) {
                return {
                    name: old.name,
                    default: self.getAttrVal(old.name)
                };
            });
        }
    },

    getAttrVal: function(attr) {
        var el = this.$el.find('input[data-attr=' + attr + ']');
        return $(el).val();
    },

    validate: function() {
        var self = this;
        self.valid = true;
        _.forEach(this.create, function(obj) {
            var attr = obj.name;
            if ( _.has(self.validators, attr) ) {
                // if valid is false at any point, then due to short-circuiting the remaining validators won't be called
                self.valid = self.valid && self.validators[attr](self.getAttrVal(attr));
            }
        });
        return self.valid;
    }
});


/*
    Advice to implementer:
    Take inspiration from the CrudAddItem view and how it's used by KolibriCrudView in order to create a modal
    that allows items to be edited.
*/
var CrudEditItem = Mn.ItemView.extend({});


/*
    KolibriCrudView attempts to provide a unified interface for managing lists of objects.
    As the name suggests, it provides four basic operations, all of which are customizable by passing options
    to the constructor:
    * Display a collection of items
    * Create new items and add them to the collection
    * Remove existing items from the collection
    * Edit items in the collection

    Required constructor options:
    * collection: A Backbone.Collection which KolibriCrudView manages
    * create: A list of strings naming attributes which the user must provide to create a new item.
        At this time, input is only through a text field and no validation is provided.

    Optional constructor options:
    * display: A list of strings naming attributes of the collection's models which will be displayed.
        If falsy, then *all* of the model's .attributes hash will be shown.
        Default is `false`;
    * createModalTitle: A string, the title of the modal when adding a new item.
        Default: 'Create a new item'
    * modelClass: The class of the Models in the collection. Can be specified to e.g. use custom initialization logic
        when creating a new model through the add modal.
        Default: Backbone.Model
    * modalService: The object on which the "showModal" event is triggered when the user clicks the add button.
        The event is passes two arguments, an instance of a CrudAddItem view to be displayed and the value of
        createModalTitle. The intent is that the user will inject their own modal service object.
        Default: the KolibriCrudView instance itself -- then the user may listen for the event to implement custom
            logic.
 */
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
        // Required options
        this.create = options.create;
        this.collection = options.collection;

        // Options with default values
        this.display = options.display || false;
        this.modelClass = options.modelClass || Backbone.Model;
        this.createModalTitle = options.createModalTitle || 'Create a new item';
        this.modalService = options.modalService || this;
        this.createValidators = options.createValidators || {};

        this.collectionView = new CrudCollection({
            collection: this.collection,
            display: this.display
        });
    },

    onBeforeShow: function() {
        this.showChildView('collectionRegion', this.collectionView);
    },

    onAddClicked: function() {
        var model = new this.modelClass();
        var modalView = new CrudAddItem({
            model: model,
            collection: this.collection,
            create: this.create,
            validators: this.createValidators
        });
        // Something *else* has to be listening to this object's "showModal" event in order to handle it.
        // In practice this means that when using KolibriCrudView, the user is responsible for setting up a
        // listener, otherwise the add functionality simply won't work.
        // But is this a good model for a modal service?
        this.modalService.trigger('showModal', modalView, this.createModalTitle);
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
