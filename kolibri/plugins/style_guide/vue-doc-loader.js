var vuedoc = require('@vuedoc/parser');
var _ = require('lodash')

var pascalCase = _.flow(_.camelCase, _.upperFirst);

/**
 * Loader that extracts the props, events, slots and methods from a Vue component
 * file.
 * Uses a Kolibri fork of @vuedoc/parser.
 */
module.exports = function(content) {
  var callback = this.async();

  var options = {
    filecontent: content,
    defaultMethodVisibility: 'private',
  };

  var json;
  vuedoc
    .parse(options)
    .then(component => {
      component.name = pascalCase(component.name)
      for (const prop of component.props) {
        prop.name = _.camelCase(prop.name)
      }
      json = JSON.stringify(component);
      callback(null, `export default ${json}; `);
    })
    .catch(err => {
      callback(err);
    });
};
