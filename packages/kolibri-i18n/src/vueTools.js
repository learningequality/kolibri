/*
  Modifications to match our component linting conventions.
  Surround style and script blocks by 2 new lines and ident.
*/
function indentAndAddNewLines(str) {
  if (str) {
    str = str.replace(/^(\n)*/, '\n\n');
    str = str.replace(/(\n)*$/, '\n\n');
    str = str.replace(/(.*\S.*)/g, '  $1');
    return str;
  }
}

function insertContent(source, block, formatted) {
  if (source) {
    const start = block.start;
    const end = block.end;
    const indented = indentAndAddNewLines(formatted);
    return source.replace(source.slice(start, end), indented);
  }
}

module.exports = {
  insertContent,
};
