var DialogSheet = function(element) {
  var self = this;
  var $element = this.$element = $(element);
  var element = this.element = $element.get(0);
  
  $element.click(function(evt) {
    self.hide();
    evt.preventDefault();
  });
  $('.insideLink').click(function(event){
    event.stopImmediatePropagation();
  });
  
  element.addEventListener('webkitTransitionEnd', this);
  element.addEventListener('oTransitionEnd', this);
  element.addEventListener('transitionend', this);
  
  $element.data('dialogSheet', this);
};

DialogSheet.prototype = {
  element: null,
  $element: null,
  isVisible: false,
  handleEvent: function(evt) {
    switch (evt.type) {
      case 'webkitTransitionEnd':
      case 'oTransitionEnd':
      case 'transitionend':
        var $element = $(evt.target);
        
        if (!$element.is('div.dialog-sheet') && !$element.is('div.dialog-sheet-bottom')) return;
        
        var dialogSheet = $element.data('dialogSheet');
        
        if (dialogSheet.isVisible) {
          var didShowEvent = jQuery.Event('didShowDialogSheet', {
            dialogSheet: dialogSheet
          });
          
          $element.trigger(didShowEvent);
        } else {
          var didHideEvent = jQuery.Event('didHideDialogSheet', {
            dialogSheet: dialogSheet
          });
          
          $element.trigger(didHideEvent);
        }
        break;
      default:
        break;
    }
  },
  show: function() {
    if (this.isVisible) return;
    
    var $element = this.$element;
    var willShowEvent = jQuery.Event('willShowDialogSheet', {
      dialogSheet: this
    });
    var didShowEvent = jQuery.Event('didShowDialogSheet', {
      dialogSheet: this
    });
    
    $element.trigger(willShowEvent);
    if ($element.is('div.dialog-sheet-bottom')) {
      if (typeof is_preview === 'undefined') {
        // nop
      } else {
        $element.css('top', '-=60');
      }
    }
    $element.addClass('active');
    
    this.isVisible = true;
  },
  hide: function() {
    if (!this.isVisible) return;
    
    var $element = this.$element;
    var willHideEvent = jQuery.Event('willHideDialogSheet', {
      dialogSheet: this
    });
    var didHideEvent = jQuery.Event('didHideDialogSheet', {
      dialogSheet: this
    });
    
    $element.trigger(willHideEvent);
    $element.removeClass('active');
    
    this.isVisible = false;
  }
};

function CreateDialogSheetFor(element) {
  return new DialogSheet(element);
}

// $(function() {
//   var $dialogSheets = $('div.dialog-sheet');
//   $dialogSheets.each(function(index, element) { new DialogSheet(element); });
  
//   var $dialogSheetShadow = $('<div class="dialog-sheet-shadow"/>');
//   $(document.body).append($dialogSheetShadow);
  
//   var $dialogSheetLinks = $('a.dialog-sheet');
//   $dialogSheetLinks.bind('click', function(evt) {
//     var $this = $(this);
//     var $dialogSheetElement = $($this.attr('href'));
//     var dialogSheet = $dialogSheetElement.data('dialogSheet');
    
//     dialogSheet.show();
//     evt.preventDefault();
//   });
  
//   $(window).bind('keyup', function(evt) {
//     if (evt.keyCode === 27) {
//       var $dialogSheetElement = $('div.dialog-sheet.active');
      
//       if ($dialogSheetElement.size() > 0) {
//         var dialogSheet = $dialogSheetElement.data('dialogSheet');
      
//         dialogSheet.hide();
//         evt.preventDefault();
//       }
//     }
//   });
// });
