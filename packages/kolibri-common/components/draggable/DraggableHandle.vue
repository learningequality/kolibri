<script>

  import { HANDLE_CLASS } from './classDefinitions';
  import renderSlotRoot from './renderSlotRoot';

  export default {
    name: 'DraggableHandle',
    // marks the element the consumer wrote as the drag handle SortableJS matches,
    // rather than wrapping it in one of its own
    render() {
      return renderSlotRoot(this, HANDLE_CLASS);
    },
  };

</script>
