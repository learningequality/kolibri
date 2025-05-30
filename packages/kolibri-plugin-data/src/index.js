const domParser = new DOMParser();

/*
 * JSON data that we read from Django have been passed through
 * Django's marksafe function that escapes any HTML characters.
 * Use the DOMParser to decode these before we read parse the JSON.
 */
function decodeMarkedSafeText(text) {
  const dom = domParser.parseFromString(text, 'text/html');
  return dom.documentElement.textContent;
}

const template = document.querySelector(`template[data-plugin="${__kolibriModuleName}"]`);

const data = template ? JSON.parse(decodeMarkedSafeText(template.innerHTML.trim())) : {};

export default data;
