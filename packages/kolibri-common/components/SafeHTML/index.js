import DOMPurify from 'dompurify';
import kebabCase from 'lodash/kebabCase';
import './style.scss';
import SafeHtmlTable from './SafeHtmlTable.vue';
import SafeHtmlImage from './SafeHtmlImage.vue';

const ALLOWED_URI_REGEXP = /^(?:(?:blob:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;
const FORBID_TAGS = ['style', 'link'];
const FORBID_ATTR = ['style', 'width', 'height'];
const ADD_TAGS = ['semantics'];

// Factory function to create SafeHTML with custom component support
export function createSafeHTML(customComponents = {}) {
  const validProps = Object.keys(customComponents).reduce((acc, tagName) => {
    for (const prop of Object.keys(customComponents[tagName].props || {})) {
      acc[kebabCase(prop)] = true;
    }
    return acc;
  }, {});
  return {
    name: 'SafeHTML',
    functional: true,
    props: {
      html: {
        required: true,
      },
    },
    render(h, context) {
      const docFragment = DOMPurify.sanitize(context.props.html, {
        ADD_TAGS,
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

      function mapNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();

          // Check if this is a custom element
          const CustomComponent = customComponents[tagName];

          if (CustomComponent) {
            // Extract attributes and convert to props
            const attrs = {};
            const props = {};

            for (const attr of node.attributes) {
              attrs[attr.name] = attr.value;
              const propName = attr.name.replace(/-([a-z])/g, g => g[1].toUpperCase());
              props[propName] = attr.value;
            }

            return h(
              CustomComponent,
              {
                props,
                attrs,
                on: context.listeners,
              },
              mapChildren(node.childNodes),
            );
          }
          // Handle regular HTML elements
          const attrs = {};
          for (const attr of node.attributes) {
            attrs[attr.name] = attr.value;
          }

          attrs.class = attrs.class ? `${attrs.class} safe-html` : 'safe-html';
          if (tagName === 'table') {
            return h(
              SafeHtmlTable,
              {
                props: { node },
                attrs,
              },
              mapChildren(node.childNodes),
            );
          }

          if (tagName === 'img') {
            return h(SafeHtmlImage, {
              attrs,
              props: {
                src: attrs.src,
                alt: attrs.alt,
              },
            });
          }

          return h(tagName, { attrs }, mapChildren(node.childNodes));
        }

        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
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
