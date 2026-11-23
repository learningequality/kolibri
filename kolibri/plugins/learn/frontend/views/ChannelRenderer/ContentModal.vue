<template>

  <Backdrop
    :transitions="true"
    class="backdrop"
  >
    <div
      class="viewer"
      :class="{ 'viewer-small': windowIsSmall, 'viewer-medium': windowIsMedium }"
      role="dialog"
      aria-modal="true"
      :aria-label="contentNode.title"
    >
      <KFocusTrap
        @shouldFocusFirstEl="focusCloseButton"
        @shouldFocusLastEl="focusCloseButton"
      >
        <KToolbar
          ref="toolbar"
          class="toolbar"
        >
          <template #icon>
            <KIconButton
              ref="closeButton"
              icon="close"
              :ariaLabel="closeAction$()"
              :tooltip="closeAction$()"
              :color="$themeTokens.textInverted"
              @click="$emit('close')"
            />
          </template>

          <h2 class="title">{{ contentNode.title }}</h2>
        </KToolbar>

        <ContentItem
          :key="contentNode.id"
          :contentNode="contentNode"
        />
      </KFocusTrap>
    </div>
  </Backdrop>

</template>


<script>

  import { nextTick, onMounted, onUnmounted, ref } from 'vue';
  import { useEventListener } from '@vueuse/core';
  import KToolbar from 'kolibri-design-system/lib/KToolbar';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import Backdrop from 'kolibri/components/Backdrop';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import ContentItem from './ContentItem';

  export default {
    name: 'ContentModal',
    components: {
      Backdrop,
      ContentItem,
      KToolbar,
    },
    setup(props, { emit }) {
      const toolbar = ref(null);
      const closeButton = ref(null);
      const { windowIsSmall, windowIsMedium } = useKResponsiveWindow();
      const { closeAction$ } = coreStrings;
      let previousFocus;

      function focusCloseButton() {
        closeButton.value.$el.focus();
      }

      useEventListener(toolbar, 'keydown', event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          emit('close');
        }
      });
      onMounted(() => {
        previousFocus = document.activeElement;
        focusCloseButton();
      });
      onUnmounted(async () => {
        await nextTick();
        previousFocus?.focus();
      });

      return {
        closeAction$,
        closeButton,
        focusCloseButton,
        toolbar,
        windowIsSmall,
        windowIsMedium,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .backdrop {
    z-index: 4;
  }

  .viewer {
    z-index: inherit;
    width: 80%;
    max-height: calc(100vh - 80px);
    margin: 40px auto;
    overflow: hidden;
    background-color: var(--tokens-surface);
    border-radius: 4px;
  }

  .viewer-medium {
    width: 90%;
  }

  .viewer-small {
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    margin: 0;
    border-radius: 0;
  }

  .toolbar {
    color: var(--tokens-textInverted);
    background-color: var(--tokens-primary);
  }

  .title {
    margin: 0;
    font: inherit;
  }

</style>
