<script>

  import { HANDLE_CLASS } from './classDefinitions';

  export default {
    name: 'DragHandle',
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
    render(createElement) {
      return createElement('div', [this.$slots.default[0]]);
    },
  };

</script>
