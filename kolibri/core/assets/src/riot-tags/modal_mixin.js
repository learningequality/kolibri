'use strict';


/*
`modal_mixin` provides a tag with:
 - a boolean `visible` attribute
 - a `show` and `hide` method
 - `show` and `hide` events
 - `modal`, `modal-hidden`, and `modal-content` CSS classes
*/

require('./modal_mixin.css');

var ModalMixin = {
  visible: false,
  show: function() {
    this.visible = true;
    this.trigger('show');
  },
  hide: function() {
    this.visible = false;
    this.trigger('hide');
  }
};


// module API
module.exports = ModalMixin;
