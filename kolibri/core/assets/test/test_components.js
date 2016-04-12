'use strict';

var $ = require('jquery');
var _ = require('lodash');
var assert = require('assert');
var Backbone = require('backbone');
var Mn = require('backbone.marionette');

var components = require('../src/components.js');

describe('Components test suite:', function(){
    before(function() {
        this.app = new Mn.Application();
        this.app.addRegions({body: 'body'});
    });


    afterEach(function() {
        this.app.getRegion('body').empty();
    });


    describe('TagList', function(){
        beforeEach(function(){
            var tags = new Backbone.Collection([
                new Backbone.Model({name: 'tag1'}),
                new Backbone.Model({name: 'tag2'}),
                new Backbone.Model({name: 'tag3'})
            ]);
            this.tagList = new components.TagList({collection: tags});
            this.app.getRegion('body').show(this.tagList);
        });

        it('triggers a "tag_list:tag_clicked" event when a tag is clicked', function(done){
            this.tagList.on('tag_list:tag_clicked', function(){
                done();
            });
            this.tagList.$el.find('.tag:first').click();
        });

        it('passes the tag name to the callback function', function(done){
            this.tagList.on('tag_list:tag_clicked', function(name){
                assert(name === 'tag1');
                done();
            });
            this.tagList.$el.find('.tag:first').click();
        });
    });


    describe('TextLineInput', function(){
        beforeEach(function(){
            var model = new Backbone.Model({
                enabled: true
            });
            this.textInput = new components.TextLineInput({model: model});
            this.app.getRegion('body').show(this.textInput);
        });

        it('triggers a "text_input:text_changed" event when enter is pressed', function(done){
            this.textInput.on('text_input:text_changed', function(){
                done();
            });
            var ev = $.Event('keyup');
            ev.which = 13; // 13 corresponds to enter. This is normalized by jquery.
            this.textInput.$el.find('input').trigger(ev);
        });

        it('triggers a "text_input:text_changed" event when focus is changed', function(done){
            this.textInput.on('text_input:text_changed', function(){
                done();
            });
            this.textInput.$el.find('input').focusout();
        });

        it('is disabled with .toggleEnable', function(){
            assert(false);
        });

        it('is enabled gain when .toggleEnable called twice', function(){
            assert(false);
        });
    });


    describe('ValidatingTextInput:', function(){
        before(function(){
            var model = new Backbone.Model({
                enabled: true,
                validator: /^\w+!{1,3}$/  // For instance, matches 'hello!!!' but not 'goodbye?'
            });
            this.textInput = new components.ValidatingTextInput({model: model});
            this.app.getRegion('body').show(this.textInput);
        });

        it('triggers a "text_input:validated" event when valid input is entered', function(done){
            assert(false);
        });
    });
});
