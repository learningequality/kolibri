
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
