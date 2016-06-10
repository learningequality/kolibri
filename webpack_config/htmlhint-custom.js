
/*
Custom rules for the HTML linter.
Custom rule IDs are prefixed with a double dash ('--')
*/

var HTMLHint = require('htmlhint').HTMLHint;

/*
  Based on the existing `attr-value-double-quotes` rule
*/
HTMLHint.addRule({
    id: '--attr-value-single-quotes',
    description: 'Attribute values must be in single quotes.',
    init: function(parser, reporter) {
        var self = this;
        parser.addListener('tagstart', function(event) {
            var attrs = event.attrs,
                attr,
                col = event.col + event.tagName.length + 1;
            for (var i=0, l=attrs.length;i<l;i++) {
                attr = attrs[i];
                if (attr.quote !== "'" && attr.value !== '') {
                    reporter.error('The value of attribute [ '+attr.name+' ] must be in single quotes.', event.line, col + attr.index, self, attr.raw);
                }
            }
        });
    }
});

/*
  Based on the existing `tag-self-close` rule
*/
HTMLHint.addRule({
    id: '--no-tag-self-close',
    description: 'Self-closing tags are not valid HTML5.',
    init: function(parser, reporter) {
        var self = this;
        parser.addListener('tagstart', function(event) {
            if (event.close) {
                reporter.warn('In : [ '+event.tagName+' ] self-closing tags are not valid HTML5.', event.line, event.col, self, event.raw);
            }
        });
    }
});
