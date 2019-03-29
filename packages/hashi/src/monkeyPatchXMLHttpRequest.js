export default function() {
  // Override the open method to add the X-Requested-With
  // header properly for any requests to the server.
  // Do this to ensure that the Django side `is_ajax` check
  // is appropriately set.
  XMLHttpRequest.prototype.origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    this.origOpen.apply(this, arguments);
    this.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  };
}
