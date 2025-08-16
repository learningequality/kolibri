import DOMPurify from 'dompurify';
import kebabCase from 'lodash/kebabCase';
import './style.scss';
import SafeHtmlTable from './SafeHtmlTable.js';
import SafeHtmlImage from './SafeHtmlImage.vue';

const ALLOWED_URI_REGEXP = /^(?:(?:blob:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;
const FORBID_TAGS = ['style', 'link'];
const FORBID_ATTR = ['style', 'width', 'height'];

// Factory function to create SafeHTML with custom component support
export function createSafeHTML(customComponents = {}) {
  const validProps = Object.keys(customComponents).reduce((acc, tagName) => {
    for (const prop of Object.keys(customComponents[tagName].props || {})) {
      // Convert camelCase to kebab case for to convert Vue props to HTML attributes
      const kebabCaseProp = kebabCase(prop);
      acc[kebabCaseProp] = true;
    }
    return acc;
  }, {});
  return {
    name: 'SafeHTML',
    functional: true,
    props: {
      html: {
        required: true,
        type: String,
      },
      styleOverrides: {
        type: Object,
        default: () => ({}),
      },
    },
    render(h, context) {
      const docFragment = DOMPurify.sanitize(context.props.html, {
        FORBID_TAGS,
        ALLOWED_URI_REGEXP,
        FORBID_ATTR,
        KEEP_CONTENT: false,
        CUSTOM_ELEMENT_HANDLING: {
          tagNameCheck: tagName => Boolean(customComponents[tagName.toLowerCase()]),
          attributeNameCheck: attrName => Boolean(validProps[attrName]),
          allowCustomizedBuiltInElements: true,
        },
        RETURN_DOM_FRAGMENT: true,
      });
      let tableCounter = 0;
      function mapNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();

          // Check if this is a custom element
          const CustomComponent = customComponents[tagName];

          if (CustomComponent) {
            // Extract attributes and convert to props
            const attributes = {};
            const props = {};

            for (const attr of node.attributes) {
              // Keep original attribute names for attrs
              attributes[attr.name] = attr.value;

              // Convert kebab-case to camelCase for props
              const propName = attr.name.replace(/-([a-z])/g, g => g[1].toUpperCase());
              props[propName] = attr.value;
            }

            const children = mapChildren(node.childNodes);

            return h(
              CustomComponent,
              {
                props,
                attrs: attributes,
                // Forward any listeners from the context
                on: context.listeners,
              },
              children,
            );
          }

          // Handle regular HTML elements
          const attributes = {};
          for (const attr of node.attributes) {
            attributes[attr.name] = attr.value;
          }
          attributes.class = attributes.class ? `${attributes.class} safe-html` : 'safe-html';

          if (tagName === 'table') {
            tableCounter += 1;
            return h(SafeHtmlTable, {
              props: {
                node,
                attributes,
                tableCounter,
                windowSizeClass: context.props.styleOverrides
                  ? context.props.styleOverrides.windowSizeClass
                  : '',
                mapNode,
                mapChildren,
              },
            });
          }

          if (tagName === 'img') {
            return h(SafeHtmlImage, {
              attrs: attributes,
              props: {
                src: attributes.src,
                alt: attributes.alt,
                styleOverrides: context.props.styleOverrides,
              },
            });
          }

          return h(tagName, { attrs: attributes }, mapChildren(node.childNodes));
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
          return node.textContent;
        }
        return null;
      }

      function mapChildren(childNodes) {
        return Array.from(childNodes).map(mapNode).filter(Boolean);
      }

      return mapChildren(docFragment.childNodes);
    },
  };
}

export default createSafeHTML();
