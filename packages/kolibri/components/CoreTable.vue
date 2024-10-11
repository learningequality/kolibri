<script>

  import get from 'lodash/get';
  import logger from 'kolibri-logging';
  import KCircularLoader from 'kolibri-design-system/lib/loaders/KCircularLoader';

  const logging = logger.getLogger(__filename);

  export default {
    name: 'CoreTable',
    components: { KCircularLoader },
    props: {
      selectable: {
        type: Boolean,
        default: false,
        required: false,
      },
      emptyMessage: {
        type: String,
        default: null,
      },
      dataLoading: {
        type: Boolean,
        default: false,
        required: false,
      },
    },
    computed: {
      tHeadStyle() {
        return {
          borderBottom: `solid 1px ${this.$themeTokens.fineLine}`,
          fontSize: '12px',
          color: this.$themeTokens.annotation,
        };
      },
      tbodyTrStyle() {
        const selectable = {
          cursor: 'pointer',
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_200,
          },
        };
        return Object.assign(
          {
            ':not(:last-child)': {
              borderBottom: `solid 1px ${this.$themeTokens.fineLine}`,
            },
          },
          this.selectable ? selectable : {},
        );
      },
    },
    render(createElement) {
      let tableHasRows = true;

      // create <thead> element with #headers slot
      const theadEl = createElement('thead', { style: this.tHeadStyle }, [
        createElement('tr', {}, this.$slots.headers),
      ]);

      const tbodyCopy = [...this.$slots.tbody];
      tbodyCopy.forEach(tbody => {
        const tgroupChildren = get(tbody, 'componentOptions.children');
        if (tgroupChildren) {
          if (tgroupChildren.length === 0) {
            tableHasRows = false;
          } else if (
            tgroupChildren.length === 1 &&
            tgroupChildren[0]?.tag?.includes('transition-group')
          ) {
            const [child] = tgroupChildren;
            const children = child.children || child.componentOptions?.children;
            tableHasRows = !!children?.length > 0;
          } else {
            tableHasRows = true;
          }
        }

        if (tbody.children) {
          tableHasRows = tbody.children.length > 0;
          tbody.children.forEach(child => {
            if (!child.data) {
              child.data = {};
            }
            if (!child.data.class) {
              child.data.class = [];
            } else if (child.data.class && !Array.isArray(child.data.class)) {
              child.data.class = [child.data.class];
            }
            child.data.class.push(this.$computedClass(this.tbodyTrStyle));
          });
        }
      });
      // If we have loaded the data, but have no empty message and no rows, we log an error.
      if (!this.dataLoading && !this.emptyMessage && !tableHasRows) {
        logging.error('CoreTable: No rows in table, but no empty message provided.');
      }

      /*
       * If data is still loading, then we show a loader. Otherwise, we show the
       * empty message if there are no rows in the table. If we have loaded data, have
       * an emptyMessage and have no rows. If we have rows, then we show the table alone
       */
      const dataStatusEl = this.dataLoading
        ? createElement('p', [createElement(KCircularLoader)])
        : !tableHasRows && createElement('p', this.emptyMessage); // Only show message if no rows

      return createElement('div', { class: 'core-table-container' }, [
        createElement('table', { class: 'core-table' }, [
          ...(this.$slots.default || []),
          theadEl,
          this.dataLoading ? null : tbodyCopy,
        ]),
        dataStatusEl,
      ]);
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .core-table-container {
    @extend %momentum-scroll;

    overflow-x: auto;
    overflow-y: hidden;
  }

  .core-table {
    width: 100%;
    font-size: 14px;
  }

  /deep/ thead th {
    text-align: left;
    vertical-align: bottom;
  }

  /deep/ tr {
    text-align: left;
  }

  /deep/ th,
  /deep/ td {
    padding: 12px 8px;
    line-height: 1.5em;
    vertical-align: top;
  }

  /deep/ td {
    max-width: 300px;
    overflow-x: auto;
  }

  /deep/ .core-table-checkbox-col {
    width: 40px;

    .k-checkbox-container {
      margin: 0 0 0 2px;
      line-height: 1em;
    }
  }

  /deep/ .core-table-button-col {
    padding: 4px;
    text-align: right;

    button {
      margin: 0;
    }
  }

</style>
