'use strict';

var _ = require('lodash');
var logging = require('loglevel');

// This is aliased for your convenience!
var KolibriModule = require('kolibri_module');

var DocumentPDFModule = KolibriModule.extend({

    render: function(content_data, render_area) {
        var document_tag = document.createElement('a');
        document_tag.href = 'http://www.benlandis.com/sheet-music/piano-rickroll.pdf';
        document_tag.textContent = content_data.id;
        var title_tag = document.createElement('h1');
        title_tag.innerHTML = content_data.id;
        render_area.appendChild(title_tag);
        render_area.appendChild(document_tag);
    }
});

var documentPDFModule = new DocumentPDFModule();
