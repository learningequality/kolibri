'use strict';

var _ = require('lodash');
var logging = require('loglevel');

// This is aliased for your convenience!
var KolibriModule = require('kolibri_module');

var AudioMP4Module = KolibriModule.extend({

    render: function(content_data, render_area) {
        var audio_tag = document.createElement('audio');
        audio_tag.autoplay = true;
        audio_tag.src = 'https://freemusicarchive.org/music/download/8a46d5ff69d7c426d2a0a6854d96a683dec17802';
        audio_tag.controls = true;
        var title_tag = document.createElement('h1');
        title_tag.innerHTML = content_data.id;
        render_area.appendChild(title_tag);
        render_area.appendChild(audio_tag);
    }
});

var audioMP4Module = new AudioMP4Module();
