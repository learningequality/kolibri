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

state.addUserToClass = function(username, classname) {
  var user = state.getUser(username);
  var classroom = state.getClass(classname);
  classroom.students.push(user);
  state.trigger('change');
};

state.removeUserFromClass = function(username, classname) {
  var classroom = state.getClass(classname);
  _.remove(classroom.students, function(user) {
    return user.username === username;
  });
  state.trigger('change');
};

state.getClass = function(classname) {
  return _.find(state.classrooms, function(c) {
    return c.name === classname;
  });
};

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
  _.forEach(state.classrooms, function(classroom){
    _.remove(classroom.students, function(user) {
      return user.username === username;
    });
  });
  _.remove(state.users, function(user) {
    return user.username === username;
  });
  state.trigger('change');
};

state.getUser = function(username) {
  return _.find(state.users, function(u) {
    return u.username === username;
  });
};



// module API
module.exports = state;
