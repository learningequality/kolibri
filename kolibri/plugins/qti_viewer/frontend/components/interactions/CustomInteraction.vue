<script>

  import { h } from 'vue';
  import { StringProp, QTIIdentifierProp } from '../../utils/props';
  import PerseusCustomInteraction from './PerseusCustomInteraction.vue';

  export default {
    name: 'CustomInteraction',
    tag: 'qti-custom-interaction',

    setup(props, { attrs }) {
      return () => {
        if (props.dataType !== 'perseus') {
          throw new Error(
            `Unsupported qti-custom-interaction data-type: ${props.dataType || '(none)'}`,
          );
        }
        return h(PerseusCustomInteraction, {
          props: { responseIdentifier: props.responseIdentifier },
          // Copied because Vue deletes the keys it matches to the child's props
          // out of this hash, and setup()'s `attrs` is a live proxy it resyncs.
          attrs: { ...attrs },
        });
      };
    },
    props: {
      dataType: StringProp(false),
      responseIdentifier: QTIIdentifierProp(true),
    },
  };

</script>
