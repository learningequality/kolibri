'use strict';

// load dependencies
var riot = require('riot');
var _ = require('lodash');

/*
  The application state is just an object
  with some event publishing capability.

  NOTE - state should only be modified through setter methods.
*/
var state = {};
riot.observable(state);


/* classrooms
A list of objects with keys:
  `name` - string
  `students` - list of references to users

Here we hard-code a couple classrooms.
*/
state.classrooms = [
  {name: 'Class 1', students: []},
  {name: 'Class 2', students: []},
];


/* users
A list of objects with keys:
  `username` - string
  `fullname` - string
*/
state.users = [];

state.addUser = function(username, fullname) {
  state.users.push({username: username, fullname: fullname});
  state.trigger('change');
};

state.deleteUser = function(username) {
  _.remove(state.users, function(user) {
    return user.username === username;
  });
  state.trigger('change');
};



// module API
module.exports = state;
