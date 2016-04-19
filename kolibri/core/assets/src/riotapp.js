'use strict';

// load dependencies
var riot = require('riot');
require('normalize-css');

// load views
require('./riot-tags/app.tag.html');
require('./riot-tags/usermgmt.tag.html');
require('./riot-tags/usermgmt-user.tag.html');
require('./riot-tags/usermgmt-editor.tag.html');
require('./riot-tags/classmgmt.tag.html');
require('./riot-tags/classmgmt-room.tag.html');
require('./riot-tags/classmgmt-room-member.tag.html');
require('./riot-tags/modal.tag.html');

// load application state
var state = require('./riotapp.state');

// attach root view to DOM
var rootview = riot.mount('app');

// re-render all views whenever the state changes
state.on('change', rootview.update);

// off to the races...
console.log('Riot demo loaded!');
