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

// The MIME type an <object> uses to render its data resource: a data: URI
// carries its own media type, otherwise the type attribute applies. Using the
// data: URI's own type stops a spoofed type attribute from smuggling one MIME
// type past the filter while the browser renders another.
function objectDataMimetype(node) {
  const data = node.getAttribute('data') || '';
  const dataUriMatch = data.match(/^data:([^;,]+)/i);
  return dataUriMatch ? dataUriMatch[1].toLowerCase() : node.getAttribute('type');
}

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

  // MIME types a registered viewer handles via its object[type="..."] selectors.
  // Built lazily on first use so viewer registration has completed, then cached.
  // This is the same allowlist that drives object rendering, so the data-attribute
  // filter and the rendering decision never diverge.
  let renderableObjectMimetypes = null;
  function isRenderableObjectMimetype(mimetype) {
    if (!mimetype) {
      return false;
    }
    if (renderableObjectMimetypes === null) {
      renderableObjectMimetypes = new Set(kolibri.objectViewerMimetypes());
    }
    return renderableObjectMimetypes.has(mimetype);
  }

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

          // Only allow <object data> when a registered viewer handles its
          // effective MIME type. Blocks data:text/html (and other active-content)
          // payloads from being embedded and executed in the object's context.
          if (tagName === 'object' && !isRenderableObjectMimetype(objectDataMimetype(node))) {
            node.removeAttribute('data');
          }

          // Extract attributes and convert to props
          const attrs = {};
          const props = {
            node,
          };

          for (const attr of node.attributes) {
            attrs[attr.name] = attr.value;
            const propName = attr.name.replace(/-[a-z]/g, g => g[1].toUpperCase());
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
            const childVNode = h(
              component,
              {
                props: childProps,
                attrs,
                on: context.listeners,
              },
              mapChildren(node.childNodes),
            );
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
