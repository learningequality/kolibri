<template>

  <div
    class="table-container"
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
    typeof window !== 'undefined' && window.Node ? window.Node : { ELEMENT_NODE: 1 };

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
        const vm = this;
        return {
          functional: true,
          render(h) {
            const tableChildren = [];

            for (let i = 0; i < vm.node.childNodes.length; i++) {
              const childNode = vm.node.childNodes[i];

              if (vm.isCaption(childNode)) {
                const captionAttrs = vm.getCaptionAttrs(childNode);
                const captionChildren = vm.mapChildren(childNode.childNodes);

                tableChildren.push(
                  h(
                    'caption',
                    {
                      attrs: captionAttrs,
                      class: ['safe-html', captionAttrs.class].filter(Boolean),
                    },
                    captionChildren,
                  ),
                );
              } else if (vm.isElementNode(childNode)) {
                tableChildren.push(vm.mapNode(childNode));
              }
            }

            return tableChildren;
          },
        };
      },
    },

    methods: {
      isCaption(node) {
        return (
          node &&
          node.nodeType === ELEMENT_NODE &&
          typeof node.tagName === 'string' &&
          node.tagName.toLowerCase() === 'caption'
        );
      },

      isElementNode(node) {
        return node && node.nodeType === ELEMENT_NODE;
      },

      getCaptionAttrs(node) {
        const captionAttrs = {};

        for (const attr of node.attributes) {
          const name = attr.name.toLowerCase();
          if (name === 'id') continue;
          captionAttrs[attr.name] = attr.value;
        }

        return captionAttrs;
      },
    },
  };

</script>


<style scoped>

  .table-container {
    margin: 1em 0;
    overflow-x: auto;
  }

  caption.safe-html {
    padding: 2px 0 4px;
    font-weight: bold;
    text-align: center;
  }

</style>
