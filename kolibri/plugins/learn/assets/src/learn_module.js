'use strict';

var _ = require('lodash');
var logging = require('loglevel');

// This is aliased for your convenience!
var KolibriModule = require('kolibri_module');

var LearnModule = KolibriModule.extend({

    start: function(plugin) {
        // This is called on the kolibri_register event - make sure it is this plugin that has registered.
        if (this === plugin) {
            logging.info('Learn Started');
            var self = this;
            document.addEventListener('DOMContentLoaded', function(event) {
                self.render();
            });
        }
    },
    render: function() {
        var content = document.getElementById('content-main');
        var render_area = document.getElementById('content-render');
        var buttons = [
            {
                id: 'video',
                event: 'video/mp4'
            },
            {
                id: 'audio',
                event: 'audio/mp3'
            },
            {
                id: 'pdf',
                event: 'document/pdf'
            }
        ];
        var self = this;
        buttons.forEach(function(button) {
            var button_node = document.createElement('button');
            button_node.id = button.id;
            button_node.innerHTML = button.id;
            button_node.onclick = function () {
                self.trigger('content_render:' + button.event, button, render_area);
            };
            content.appendChild(button_node);
        });
    }
});

var learnModule = new LearnModule();
