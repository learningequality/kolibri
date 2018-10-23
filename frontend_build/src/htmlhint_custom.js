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
  Based on the existing `tag-self-close` rule
*/
HTMLHint.addRule({
  id: '--no-self-close-common-html5-tags',
  description: 'Self-closing HTML5 tags are not valid.',
  init: function(parser, reporter) {
    var self = this;
    var commonTags = parser.makeMap(`a,audio,b,body,button,canvas,caption,center,dir,div,dl,em,font,footer,
      form,h1,h2,h3,h4,h5,h6,head,header,html,iframe,label,li,main,map,menu,nav,object,option,output,p,progress,
      q,script,section,select,span,strong,style,sub,table,tbody,td,textarea,th,thead,time,title,tr,u,ul,var,video`);
    parser.addListener('tagstart', function(event) {
      var tagName = event.tagName.toLowerCase();
      if (event.close && commonTags[tagName]) {
        reporter.error(
          'In : [ ' + event.tagName + ' ] self-closing tags are not valid HTML5.',
          event.line,
          event.col,
          self,
          event.raw
        );
      }
    });
  },
});

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
    parser.addListener('text', function(event) {
      var eventData = clean(event.raw);
      var last = event.lastEvent;
      if (last.type === 'tagstart') {
        if (stack.length === 1 && last.tagName === 'template') {
          var match = eventData.match(/^(\n*)( *)/);
          if (match && match[1].length !== 2) {
            reporter.error(
              'Top-level content should be surrounded by one empty line.',
              event.line,
              event.col,
              self,
              event.raw
            );
          }
          if (match && match[2].length !== 2) {
            reporter.error(
              'Top-level content should be indented two spaces.',
              event.line,
              event.col,
              self,
              event.raw
            );
          }
        }
      }
    });
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
        } else {
          // note - [^] is like . except it matches newlines
          // http://stackoverflow.com/questions/1068280/javascript-regex-multiline-flag-doesnt-work
          var match = eventData.match(/^(\n*)( *)[^]+?(\n*)$/);
          if (match) {
            if (match && match[1].length !== 2) {
              reporter.error(
                'Top-level content should be surrounded by one empty line.',
                event.line,
                event.col,
                self,
                event.raw
              );
            }
            if (match && match[2].length !== 2) {
              reporter.error(
                'Top-level content should be indented two spaces.',
                event.line,
                event.col,
                self,
                event.raw
              );
            }
            if (match && match[3].length !== 2) {
              var offset = (eventData.match(/\n/g) || []).length;
              reporter.error(
                'Top-level content should be surrounded by one empty line.',
                event.line + offset,
                1,
                self,
                event.raw
              );
            }
          }
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
      var last = event.lastEvent;
      var lastData = clean(last.raw);
      if (last.type === 'text') {
        if (stack.length === 1 && event.tagName === 'template') {
          var match = lastData.match(/(\n*)$/);
          if (match && match[1].length !== 2) {
            reporter.error(
              'Top-level content should be surrounded by one empty line.',
              event.line,
              event.col,
              self,
              event.raw
            );
          }
        }
      }
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
      stack.length = pos;
    });
  },
});
