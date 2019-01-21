<script>

  import { HANDLE_CLASS } from './classDefinitions';

  export default {
    name: 'KDragHandle',
    mounted() {
      this.setClass();
    },
    // re-set because it gets wiped out
    updated() {
      this.setClass();
    },
    methods: {
      setClass() {
        if (!this.$el.classList.contains(HANDLE_CLASS)) {
          this.$el.classList.add(HANDLE_CLASS);
        }
      },
    },
    // render the first element passed in without a wrapper node
    render() {
      return this.$slots.default[0];
    },
  };

</script>
