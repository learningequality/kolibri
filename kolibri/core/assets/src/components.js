'use strict';
var logging = require('loglevel');
var Mn = require('backbone.marionette');

logging.setDefaultLevel(2);

logging.info('Component views loaded!');


var TextInputField = Mn.ItemView.extend({
    template: '<div>textInput!</div>'
});

var TagList = Mn.CollectionView.extend({});


module.exports = {
    TextInputField: TextInputField,
    TagList: TagList
};
