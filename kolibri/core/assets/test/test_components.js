'use strict';

var $ = require('jquery');
var assert = require('assert');
var Backbone = require('backbone');
var Mn = require('backbone.marionette');

var components = require('../src/components.js');

describe('Components test suite:', function(){
    before(function() {
        this.app = new Mn.Application();
        this.app.addRegions({body: 'body'});
    });

    after(function() {
        this.app.getRegion('body').empty();
    });

    describe('TagList', function(){
        before(function(){
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
});
