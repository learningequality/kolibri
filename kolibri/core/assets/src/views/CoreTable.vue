<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'CoreTable',
    props: {
      selectable: {
        type: Boolean,
        default: false,
        required: false,
      },
    },
    computed: {
      ...mapGetters(['$coreGrey', '$coreTextAnnotation']),
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
      this.$slots.thead.forEach(thead => {
        thead.data.style = Object.assign(thead.data.style || {}, this.tHeadStyle);
      });
      this.$slots.tbody.forEach(tbody => {
        if (tbody.children) {
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
      return createElement('div', { class: 'core-table-container' }, [
        createElement('table', { class: 'core-table' }, [
          ...(this.$slots.default || []),
          this.$slots.thead,
          this.$slots.tbody,
        ]),
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
    padding: 12px 16px 12px 0;
    line-height: 1.5em;
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
