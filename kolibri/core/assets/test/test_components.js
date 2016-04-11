'use strict';

var $ = require('jquery');
var Backbone = require('backbone');
var components = require('../src/components.js');

describe('TagList', function(){
    before(function(){
        var tags = new Backbone.Collection([
            new Backbone.Model({name: 'tag1'}),
            new Backbone.Model({name: 'tag2'}),
            new Backbone.Model({name: 'tag3'})
        ]);
        this.tagList = new components.TagList({collection: tags});
        this.listener = new Backbone.Model();
    });

    it('triggers a "tag_list:tag_clicked" event when a tag is clicked', function(done){
        this.listener.listenTo(this.tagList, 'tag_list:tag_clicked', done);
        this.tagList.$el.find('.tag:first').click();
    });

    it('passes the tag name to the callback function', function(done){
        this.listener.listenTo(this.tagList, 'tag_list:tag_clicked', function(name){
            assert(name === 'tag1');
            done();
        });
        this.tagList.$el.find('.tag:first').click();
    });
});
