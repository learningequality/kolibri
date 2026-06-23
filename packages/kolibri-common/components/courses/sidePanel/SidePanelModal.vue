<template>

  <div
    role="presentation"
    @keyup.esc="closePanel"
  >
    <KFocusTrap
      @shouldFocusFirstEl="focusFirstEl"
      @shouldFocusLastEl="focusLastEl"
    >
      <!-- aria-labelledby links to the title in SidePanelLayout.vue -->
      <section
        ref="sidePanel"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :style="sidePanelStyles"
        aria-labelledby="side-panel-title"
      >
        <slot></slot>
      </section>
    </KFocusTrap>
    <Backdrop
      :transitions="true"
      @click="closePanel"
    />
  </div>

</template>


<script>

  import { computed, onMounted, onUnmounted, ref } from 'vue';
  import Backdrop from 'kolibri/components/Backdrop';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
  import { isTouchDevice } from 'kolibri/utils/browserInfo';
  import useUser from 'kolibri/composables/useUser';
  import { currentLanguage, isRtl } from 'kolibri/utils/i18n';
  import useReturnFocusOnUnmount from 'kolibri-common/composables/useReturnFocusOnUnmount';
  import {
    getFirstFocusableElement,
    getLastFocusableElement,
  } from 'kolibri-common/utils/focusUtils';

  export default {
    name: 'SidePanelModal',
    components: {
      Backdrop,
    },
    setup(props, { emit }) {
      useReturnFocusOnUnmount();

      const { windowIsSmall } = useKResponsiveWindow();
      const sidePanel = ref(null);

      const isRtlValue = isRtl(currentLanguage);

      const rtlAlignment = computed(() => {
        if (isRtlValue && props.alignment === 'left') {
          return 'right';
        } else if (isRtlValue && props.alignment === 'right') {
          return 'left';
        } else {
          return props.alignment;
        }
      });

      const $themeTokens = themeTokens();
      const { isAppContext } = useUser();

      const isAppContextAndTouchDevice = computed(() => {
        return isAppContext.value && isTouchDevice;
      });

      const sidePanelStyles = computed(() => {
        return {
          [rtlAlignment.value]: 0,
          width: windowIsSmall.value ? '100vw' : props.width,
          maxWidth: '100vw',
          top: 0,
          position: 'fixed',
          color: $themeTokens.text,
          backgroundColor: $themeTokens.surface,
          zIndex: 12,
          // Account for bottom nav bar height on touch devices in app context
          // If the side panel is rendered in a immersive page or any other page that do not
          // have a bottom nav bar, we will need to add a new prop to override this behavior
          height: isAppContextAndTouchDevice.value ? 'calc(100% - 56px)' : '100%',
        };
      });

      // Methods
      const closePanel = () => {
        emit('closePanel');
      };

      const focusLastEl = () => {
        const lastEl = getLastFocusableElement(sidePanel.value);
        if (lastEl) {
          lastEl.focus();
        }
      };

      const focusFirstEl = () => {
        const firstEl = getFirstFocusableElement(sidePanel.value);
        if (firstEl) {
          firstEl.focus();
        }
      };

      onMounted(() => {
        sidePanel.value?.focus();
        document.documentElement.style['overflow-y'] = 'hidden';
      });

      onUnmounted(() => {
        document.documentElement.style['overflow-y'] = 'auto';
      });

      return {
        sidePanel,
        sidePanelStyles,
        closePanel,
        focusLastEl,
        focusFirstEl,
      };
    },
    props: {
      /* Width of the side panel. Defaults to 700px */
      width: {
        type: String,
        required: false,
        default: '700px',
      },
      /* Which side of the screen should the panel be fixed? Reverses the value when isRtl */
      alignment: {
        type: String,
        default: 'right',
        validator(value) {
          return ['right', 'left'].includes(value);
        },
      },
    },
  };

</script>
