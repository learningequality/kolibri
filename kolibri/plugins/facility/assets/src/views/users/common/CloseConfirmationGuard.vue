<template>

  <div>
    <KModal
      v-if="isConfirmationModalOpen"
      appendToOverlay
      :submitText="continueAction$()"
      :cancelText="cancelAction$()"
      :title="closeConfirmationTitle$()"
      @cancel="onCancel"
      @submit="onClose"
    >
      <span class="fix-line-height">
        {{ closeConfirmationMessage$() }}
      </span>
    </KModal>
  </div>

</template>


<script>

  import { onMounted, onUnmounted, ref } from 'vue';
  import { useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';

  /**
   * This component is used to show a confirmation modal when the user tries to
   * close the page (by leaving the route) with unsaved changes.
   */
  export default {
    name: 'CloseConfirmationGuard',
    setup(props) {
      const router = useRouter();
      const isConfirmationModalOpen = ref(false);
      const closeConfirmationToRoute = ref(null);

      const onClose = () => {
        if (closeConfirmationToRoute.value) {
          return router.push(closeConfirmationToRoute.value);
        }
        isConfirmationModalOpen.value = false;
      };

      const onCancel = () => {
        isConfirmationModalOpen.value = false;
        closeConfirmationToRoute.value = null;
      };

      const { continueAction$, cancelAction$, closeConfirmationTitle$, closeConfirmationMessage$ } =
        coreStrings;

      const beforeUnload = event => {
        if (props.hasUnsavedChanges) {
          if (!window.confirm(closeConfirmationTitle$())) {
            event.preventDefault();
          }
        }
      };

      onMounted(() => {
        window.addEventListener('beforeunload', beforeUnload);
      });

      onUnmounted(() => {
        window.removeEventListener('beforeunload', beforeUnload);
      });

      const beforeRouteLeave = (to, from, next) => {
        if (props.hasUnsavedChanges && !closeConfirmationToRoute.value) {
          isConfirmationModalOpen.value = true;
          closeConfirmationToRoute.value = to;
          next(false);
        } else {
          next();
        }
      };

      return {
        isConfirmationModalOpen,
        onClose,
        onCancel,
        continueAction$,
        cancelAction$,
        closeConfirmationTitle$,
        closeConfirmationMessage$,

        /**
         * BeforeRouteLeave guard to show confirmation modal made public so that
         * parent components that are route components can use it on their
         * beforeRouteLeave guard.
         * @public
         */
        beforeRouteLeave,
      };
    },
    props: {
      hasUnsavedChanges: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .fix-line-height {
    // Override default global line-height of 1.15 which is not enough
    // space for single lines content modal and makes scrollbar appear.
    line-height: 1.5;
  }

</style>
