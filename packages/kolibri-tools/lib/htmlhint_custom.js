/*
  Custom rules for the HTML linter.
  Custom rule IDs are prefixed with a double dash ('--')
*/
var HTMLHint = require('htmlhint').HTMLHint;

/* helper to convert alternate-style newlines to unix-style */
function clean(val) {
  return val.replace(/\r\n?/g, '\n');
}

/*
  Vue whitespace conventions.
  Based on the existing `tag-pair` rule

  This code attempts to enforce:
  - two blank lines between top-level tags
  - one blank line of padding within a top-level tag
  - one level of indent for the contents of all top-level tags

*/
HTMLHint.addRule({
  id: '--vue-component-conventions',
  description: 'Internal vue file conventions.',
  init: function(parser, reporter) {
    var self = this;
    var stack = [];
    var mapEmptyTags = parser.makeMap(
      'area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed,track,command,source,keygen,wbr'
    ); //HTML 4.01 + HTML 5
    // handle script and style tags
    parser.addListener('cdata', function(event) {
      var eventData = clean(event.raw);
      if (stack.length === 1) {
        if (eventData && !eventData.trim()) {
          reporter.error(
            'Empty top-level tags should be deleted.',
            event.line,
            event.col,
            self,
            event.raw
          );
        }
      }
    });
    parser.addListener('tagstart', function(event) {
      var eventData = clean(event.raw);
      if (!stack.length && event.lastEvent) {
        if (event.lastEvent.type === 'start') {
          if (event.line !== 1) {
            reporter.error(
              'Content should start on the first line of the file.',
              event.line,
              event.col,
              self,
              event.raw
            );
          }
        } else if (event.lastEvent.raw && clean(event.lastEvent.raw) !== '\n\n\n') {
          reporter.error(
            'Need two endlines between top-level tags.',
            event.line,
            event.col,
            self,
            event.raw
          );
        }
      }
      var tagName = event.tagName.toLowerCase();
      if (mapEmptyTags[tagName] === undefined && !event.close) {
        stack.push({
          tagName: tagName,
          line: event.line,
          raw: eventData,
        });
      }
    });
    parser.addListener('tagend', function(event) {
      var tagName = event.tagName.toLowerCase();
      for (var pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].tagName === tagName) {
          break;
        }
      }
      var arrTags = [];
      for (var i = stack.length - 1; i > pos; i--) {
        arrTags.push('</' + stack[i].tagName + '>');
      }
      try {
        stack.length = pos;
      } catch (e) {
        // if this fails, it's because `pos < 0`, i.e. more tags are closed than were ever opened
        // this should get caught by the standard linting rules, so we'll let it slide here.
      }
    });
  },
});
