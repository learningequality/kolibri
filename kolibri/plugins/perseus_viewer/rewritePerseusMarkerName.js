// wonder-blocks-dropdown's DropdownOpener re-roles the marker opener to
// `combobox` and labels it `childrenProps["aria-label"] ?? ariaLabel`, which
// Perseus never sets; Chromium exposes the label Perseus puts on the inner
// marker View as the combobox's value, not its name. Mirrors Khan/perseus#4330,
// carried by Perseus 91.0.0; recheck on a Perseus or wonder-blocks-dropdown bump.
const markerName =
  '(()=>{' +
  'const labels=markers.map(m=>String(m.label??"").trim());' +
  'let number=index+1;' +
  'while(labels.includes(String(number)))number+=markers.length;' +
  'return labels[index]||String(number)' +
  '})()';

module.exports = function (source) {
  return source
    .replace(
      '{role:"button","aria-expanded":opened,',
      `{role:"button","aria-label":${markerName},"aria-expanded":opened,`,
    )
    .replace(
      '"aria-label":markerDisabled?this.context.strings.correctExcited:label,',
      '"aria-label":markerDisabled?this.context.strings.correctExcited:undefined,',
    );
};
