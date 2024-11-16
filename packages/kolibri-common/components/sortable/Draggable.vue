<script>

  import { SORTABLE_CLASS } from './classDefinitions';

  export default {
    name: 'Draggable',
    mounted() {
      this.setClass();
    },
    // re-set because it gets wiped out
    updated() {
      this.setClass();
    },
    methods: {
      setClass() {
        if (!this.$el.classList.contains(SORTABLE_CLASS)) {
          this.$el.classList.add(SORTABLE_CLASS);
        }
      },
    },
    // render the first element passed in without a wrapper node
    render() {
      return this.$slots.default[0];
    },
  };

</script>
