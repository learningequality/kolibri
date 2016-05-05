'use strict';

var _ = require('lodash');
var logging = require('loglevel');

// This is aliased for your convenience!
var KolibriModule = require('kolibri_module');

var VideoMP4Module = KolibriModule.extend({

    render: function(content_data, render_area) {
        var video_tag = document.createElement('video');
        video_tag.autoplay = true;
        video_tag.src = 'http://vid297.photobucket.com/albums/mm238/daystar170/RickRoll.mp4';
        var title_tag = document.createElement('h1');
        title_tag.innerHTML = content_data.id;
        render_area.appendChild(title_tag);
        render_area.appendChild(video_tag);
    }
});

var videoMP4Module = new VideoMP4Module();
