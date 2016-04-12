'use strict';
var logging = require('loglevel');
var Mn = require('backbone.marionette');
var _ = require('lodash');

logging.setDefaultLevel(2);

logging.info('Component views loaded!');


var AbstractTextInput = Mn.ItemView.extend({
    template: _.template('<div>foo</div>'),

    triggers: {
        'change input': 'inputChanged',
        'focusout input': 'inputChanged'
    },

    events: {
        'keyup input': 'keyup',
        'keypress input': 'keypress'
    },

    keyup: function(ev) {
        if(ev.which === 13) { // 13 corresponds to enter, and is normalized by jQuery
            this._trigger();
        }
    },

    keypress: function() {
        /*
            Trigger the "text_input:text_changed" event when input stops. Hard-coded to 5ms.
         */
        if(this._timeout){
            clearTimeout(this._timeout);
        }
        var self = this;
        this._timeout = setTimeout(function(){
            self._trigger();
        }, 5);
    },

    onInputChanged: function(){
        this._trigger();
    },

    _trigger: function() {
        this.trigger('text_input:text_changed', this.$el.find('input').val());
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
    },

    initialize: function() {
        _.bindAll(this, 'template');
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
