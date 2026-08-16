<script>

  import { computed, h, inject, onUnmounted } from 'vue';
  import { StringProp, QTIIdentifierProp } from '../../utils/props';

  export default {
    name: 'PerseusCustomInteraction',

    setup(props) {
      const perseusItems = inject('perseusItems');
      const answerState = inject('answerState');
      const responses = inject('responses');
      const interactive = inject('interactive');
      const handlers = inject('handlers');

      const itemData = computed(() => perseusItems.value[props.dataPerseusPath] || null);

      // ContentViewer resets the Perseus renderer whenever `answerState` changes,
      // so this seeds from the viewer's own answer state, not from the record
      // graded into below.
      const seedAnswerState = computed(
        () => answerState.value[props.responseIdentifier]?.answerState || {},
      );

      let perseusViewer = null;
      const setPerseusViewer = el => {
        perseusViewer = el;
      };

      const grade = () => {
        const result = perseusViewer?.checkAnswer?.();
        const variable = responses.value[props.responseIdentifier];
        if (result && variable) {
          variable.value = {
            correct: result.correct,
            simpleAnswer: result.simpleAnswer,
            answerState: result.answerState,
          };
        } else {
          handlers.interaction();
        }
      };

      // Perseus emits `interaction` from inside the widget's own event handling,
      // before React has committed the input, so an immediate grade scores the
      // previous answer. The pending timer also guards re-entrancy: scoring can
      // itself emit an `interaction`, as a graphie image re-render does.
      let gradeTimeout = null;
      const onInteraction = () => {
        if (gradeTimeout !== null) {
          return;
        }
        gradeTimeout = setTimeout(() => {
          try {
            grade();
          } finally {
            gradeTimeout = null;
          }
        });
      };

      onUnmounted(() => {
        if (gradeTimeout !== null) {
          clearTimeout(gradeTimeout);
        }
      });

      return () => {
        if (!itemData.value) {
          return h('div');
        }
        return h('ContentViewer', {
          ref: setPerseusViewer,
          props: {
            preset: 'exercise',
            itemData: itemData.value,
            interactive: interactive.value,
            answerState: seedAnswerState.value,
          },
          on: {
            interaction: onInteraction,
          },
        });
      };
    },
    props: {
      dataPerseusPath: StringProp(false),
      responseIdentifier: QTIIdentifierProp(true),
    },
  };

</script>
