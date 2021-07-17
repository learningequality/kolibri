import xmlParser from 'fast-xml-parser';

const xmlOptions = {
  attributeNamePrefix: '@',
  attrNodeName: false,
  textNodeName: '#text',
  ignoreAttributes: false,
  ignoreNameSpace: false,
  allowBooleanAttributes: true,
  parseNodeValue: true,
  parseAttributeValue: true,
  trimValues: true,
  parseTrueNumberOnly: false,
  arrayMode: true, //"strict",
};

export default function(xml) {
  console.log(xmlParser.parse(xml.trim(), xmlOptions));
  return xmlParser.parse(xml.trim(), xmlOptions);
}

const jsonToXMLParser = new xmlParser.j2xParser(xmlOptions);

export function jsonToXML(json) {
  return jsonToXMLParser.parse(json);
}
