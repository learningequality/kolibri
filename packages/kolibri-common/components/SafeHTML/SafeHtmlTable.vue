<template>

  <div
    class="table-container"
    role="region"
    :aria-labelledby="captionId"
    data-testid="table-container"
  >
    <table
      :style="tableStyle"
      v-bind="attributes"
    >
      <component :is="renderTableContent" />
    </table>
  </div>

</template>


<script>

  const { ELEMENT_NODE } =
    typeof window !== 'undefined' && window.Node ? window.Node : { ELEMENT_NODE: 1, TEXT_NODE: 3 };

  export default {
    name: 'SafeHtmlTable',
    props: {
      node: {
        required: true,
        validator: prop => typeof prop === 'object' && prop !== null,
      },
      attributes: {
        type: Object,
        required: true,
      },
      mapNode: {
        type: Function,
        required: true,
      },
      mapChildren: {
        type: Function,
        required: true,
      },
    },
    data() {
      return {
        captionId: `table-caption-${Math.random().toString(36).substring(2, 9)}`,
      };
    },
    computed: {
      tableStyle() {
        const firstRow = this.node.querySelector && this.node.querySelector('tr');
        const colCount = firstRow ? firstRow.children.length : 0;
        let tableWidth = '640px';
        if (colCount > 3) {
          tableWidth = `${colCount * 200}px`;
        }
        return { width: tableWidth };
      },
      renderTableContent() {
        return {
          functional: true,
          render: h => {
            const tableChildren = [];

            for (let i = 0; i < this.node.childNodes.length; i++) {
              const childNode = this.node.childNodes[i];

              if (this.isCaption(childNode)) {
                const captionChildren = this.mapChildren(childNode.childNodes);

                tableChildren.push(
                  h(
                    'caption',
                    {
                      attrs: this.getCaptionAttrs(childNode),
                      domProps: { id: this.captionId },
                      class: 'safe-html',
                    },
                    captionChildren,
                  ),
                );
              } else if (this.isElementNode(childNode)) {
                tableChildren.push(this.mapNode(childNode));
              }
            }
            return tableChildren;
          },
        };
      },
    },
    methods: {
      isCaption(node) {
        return node.nodeType === ELEMENT_NODE && node.tagName.toLowerCase() === 'caption';
      },
      isElementNode(node) {
        return node && node.nodeType === ELEMENT_NODE;
      },
      getCaptionAttrs(node) {
        const captionAttrs = {};
        for (const attr of node.attributes) {
          if (attr.name.toLowerCase() !== 'id') {
            captionAttrs[attr.name] = attr.value;
          }
        }
        captionAttrs.class = (captionAttrs.class ? `${captionAttrs.class} ` : '') + 'safe-html';
        return captionAttrs;
      },
    },
  };

</script>


<style scoped>

  .table-container {
    margin: 1em 0;
  }

  caption.safe-html {
    padding: 2px 0 4px;
    font-weight: bold;
    text-align: center;
  }

</style>
