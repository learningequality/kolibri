<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'CoreTable',
    mixins: [themeMixin],
    props: {
      selectable: {
        type: Boolean,
        default: false,
        required: false,
      },
      emptyMessage: {
        type: String,
        required: false,
      },
    },
    computed: {
      tHeadStyle() {
        return {
          borderBottom: `solid 1px ${this.$coreGrey}`,
          fontSize: '12px',
          color: this.$coreTextAnnotation,
        };
      },
      tbodyTrStyle() {
        const selectable = {
          cursor: 'pointer',
          ':hover': {
            backgroundColor: this.$coreGrey,
          },
        };
        return Object.assign(
          {
            ':not(:last-child)': {
              borderBottom: `solid 1px ${this.$coreGrey}`,
            },
          },
          this.selectable ? selectable : {}
        );
      },
    },
    render(createElement) {
      let tableHasRows = true;
      this.$slots.thead.forEach(thead => {
        thead.data.style = Object.assign(thead.data.style || {}, this.tHeadStyle);
      });

      this.$slots.tbody.forEach(tbody => {
        // Need to check componentOptions if wrapped in <transition-group>, or just children
        // if in regular <tbody>
        if (tbody.componentOptions && tbody.componentOptions.children) {
          tableHasRows = tbody.componentOptions.children.length > 0;
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

      // Insert an empty message as a <p> at the end if it is provided and the
      // table has no rows.
      const showEmptyMessage = this.emptyMessage && !tableHasRows;

      return createElement('div', { class: 'core-table-container' }, [
        createElement('table', { class: 'core-table' }, [
          ...(this.$slots.default || []),
          this.$slots.thead,
          this.$slots.tbody,
        ]),
        showEmptyMessage && createElement('p', this.emptyMessage),
      ]);
    },
  };

</script>


<style lang="scss" scoped>

  .core-table-container {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .core-table {
    width: 100%;
    font-size: 14px;
  }

  /deep/ thead th {
    vertical-align: bottom;
  }

  /deep/ tr {
    text-align: left;
  }

  /deep/ th,
  /deep/ td {
    max-width: 300px;
    padding: 12px 8px;
    overflow-x: hidden;
    line-height: 1.5em;
    text-overflow: ellipsis;
    vertical-align: top;
  }

  /deep/ tr:not(:last-child) {
    border-bottom: 1px solid rgb(223, 223, 223);
  }

  /deep/ .core-table-checkbox-col {
    width: 40px;
    .k-checkbox-container {
      margin: 0 0 0 2px;
    }
  }

</style>
