import DOMPurify from 'dompurify';
import kebabCase from 'lodash/kebabCase';
import kolibri from 'kolibri';
import './style.scss';
import SafeHtmlTable from './SafeHtmlTable.vue';
import SafeHtmlImage from './SafeHtmlImage.vue';

const DEFAULT_ALLOWED_URI_REGEXP = /^(?:(?:blob:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;
const FORBID_TAGS = ['style', 'link'];
const FORBID_ATTR = ['style', 'width', 'height'];
const ADD_TAGS = ['object', 'semantics'];
const ADD_ATTR = ['data'];
const HTMLComponents = {
  img: SafeHtmlImage,
  table: SafeHtmlTable,
};

function buildAllowedUriRegexp(allowedOrigins) {
  if (!allowedOrigins || allowedOrigins.length === 0) {
    return DEFAULT_ALLOWED_URI_REGEXP;
  }
  const escaped = allowedOrigins.map(o => o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Allow the specified origins (with trailing slash/path) in addition to the defaults
  const origins = escaped.join('|');
  return new RegExp(
    `^(?:(?:${origins})/|(?:blob:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\\-:]|$))`,
    'i',
  );
}

// Factory function to create SafeHTML with custom component support
export function createSafeHTML(customComponents = {}, { allowedOrigins } = {}) {
  const validProps = Object.keys(customComponents).reduce((acc, tagName) => {
    for (const prop of Object.keys(customComponents[tagName].props || {})) {
      acc[kebabCase(prop)] = true;
    }
    return acc;
  }, {});
  const ALLOWED_URI_REGEXP = buildAllowedUriRegexp(allowedOrigins);
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
        ADD_ATTR,
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

          // Extract attributes and convert to props
          const attrs = {};
          const props = {
            node,
          };

          for (const attr of node.attributes) {
            attrs[attr.name] = attr.value;
            const propName = attr.name.replace(/-([a-z])/g, g => g[1].toUpperCase());
            props[propName] = attr.value;
          }

          attrs.class = attrs.class ? `${attrs.class} safe-html` : 'safe-html';

          // Check if this is a custom element
          const component =
            customComponents[tagName] ||
            HTMLComponents[tagName] ||
            (kolibri.canHandleElement(node) ? 'ContentViewer' : null);

          if (component) {
            const childProps = { ...props };
            // ContentViewer expects the DOM element as `element`, not `node`
            if (component === 'ContentViewer') {
              delete childProps.node;
              childProps.element = node;
              childProps.embedded = true;
            }
            // Extract class from attrs so Vue merges it with the component's
            // template class instead of overriding it. In Vue 2, class
            // inside attrs overrides a component's root element class.
            const { class: className, ...componentAttrs } = attrs;
            const childVNode = h(
              component,
              {
                class: className,
                props: childProps,
                attrs: componentAttrs,
                on: context.listeners,
              },
              mapChildren(node.childNodes),
            );
            // Wrap embedded ContentViewers in a layout container
            if (component === 'ContentViewer') {
              return h('div', { class: 'embedded-content-viewer' }, [childVNode]);
            }
            return childVNode;
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
