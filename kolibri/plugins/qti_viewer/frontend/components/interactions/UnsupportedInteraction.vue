<template>

  <div
    class="unsupported-interaction"
    role="alert"
  >
    <div class="unsupported-icon">
      <KIcon icon="warning" />
    </div>
    <div class="unsupported-content">
      <p class="unsupported-title">{{ unsupportedTitle$() }}</p>
      <p class="unsupported-message">{{ unsupportedMessage$() }}</p>
      <p
        v-if="interactionType"
        class="unsupported-type"
      >
        {{ unsupportedType$({ type: interactionType }) }}
      </p>
    </div>
  </div>

</template>


<script>

  import { createTranslator } from 'kolibri/utils/i18n';
  import { computed } from 'vue';

  const strings = createTranslator('UnsupportedInteractionStrings', {
    unsupportedTitle: {
      message: 'Unsupported Question Type',
      context: 'Title shown when a QTI interaction type is not supported by the viewer',
    },
    unsupportedMessage: {
      message:
        'This question contains an interaction type that cannot be displayed in the current viewer. Please contact your content administrator.',
      context: 'Message explaining that the QTI interaction type is not supported',
    },
    unsupportedType: {
      message: 'Unsupported interaction: {type}',
      context: 'Shows the specific unsupported QTI interaction type',
    },
  });

  export default {
    name: 'UnsupportedInteraction',
    tag: 'qti-unsupported-interaction',
    setup(props) {
      const { unsupportedTitle$, unsupportedMessage$, unsupportedType$ } = strings;
      const interactionType = computed(() => {
        // The original tag name is passed via the originalTag prop
        // Convert from kebab-case to a more readable form
        if (props.originalTag) {
          return props.originalTag
            .replace('qti-', '')
            .replace('-interaction', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        }
        return '';
      });

      return {
        unsupportedTitle$,
        unsupportedMessage$,
        unsupportedType$,
        interactionType,
      };
    },
    props: {
      originalTag: {
        type: String,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .unsupported-interaction {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
    color: var(--palette-yellow-v600);
    background-color: var(--palette-yellow-v100);
    border: 1px solid var(--palette-yellow-v400);
    border-radius: 8px;
  }

  .unsupported-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    margin-top: 2px;
  }

  .unsupported-content {
    flex: 1;
    min-width: 0;
  }

  .unsupported-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
  }

  .unsupported-message {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
  }

  .unsupported-type {
    margin: 8px 0 0;
    font-size: 12px;
    font-style: italic;
    opacity: 0.8;
  }

</style>
