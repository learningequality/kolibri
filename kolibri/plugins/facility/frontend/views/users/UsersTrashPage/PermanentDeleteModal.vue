<template>

  <KModal :title="deleteSelectionLabel$()">
    <p class="fix-line-height">
      {{ deleteSelectionDescription$({ num: selectedUsers.size }) }}
    </p>
    <template #actions>
      <KButton
        :disabled="loading"
        style="margin-right: 16px"
        :text="coreStrings.cancelAction$()"
        @click="close"
      />
      <KButton
        :appearanceOverrides="removeButtonStyles"
        :disabled="loading"
        :text="coreStrings.deleteAction$()"
        @click="hardDelete"
      />
    </template>
  </KModal>

</template>


<script>

  import { ref } from 'vue';
  import { darken1 } from 'kolibri-design-system/lib/styles/darkenColors';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import DeletedFacilityUserResource from 'kolibri-common/apiResources/DeletedFacilityUserResource';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  export default {
    name: 'PermanentDeleteModal',
    setup(props, { emit }) {
      const { createSnackbar } = useSnackbar();
      const { sendPoliteMessage } = useKLiveRegion();

      const loading = ref(false);

      const {
        deletingLabel$,
        deleteSelectionLabel$,
        usersDeletedNotice$,
        deleteSelectionDescription$,
        defaultErrorMessage$,
      } = bulkUserManagementStrings;

      const close = () => {
        emit('close');
      };

      const hardDelete = async () => {
        loading.value = true;
        sendPoliteMessage(deletingLabel$());
        try {
          await DeletedFacilityUserResource.deleteCollection({
            by_ids: Array.from(props.selectedUsers).join(','),
          });
          createSnackbar(usersDeletedNotice$());
          loading.value = false;
          emit('change', { resetSelection: true });
          close();
        } catch (error) {
          createSnackbar(defaultErrorMessage$());
          loading.value = false;
        }
      };

      const removeButtonStyles = {
        color: themeTokens().textInverted,
        backgroundColor: themePalette().red.v_600,
        ':hover': { backgroundColor: darken1(themePalette().red.v_600) },
      };

      if (props.selectedUsers.size === 0) {
        close();
      }

      return {
        // ref and computed properties
        loading,
        coreStrings,
        removeButtonStyles,

        // methods
        close,
        hardDelete,

        // translation functions
        deleteSelectionLabel$,
        deleteSelectionDescription$,
      };
    },
    props: {
      selectedUsers: {
        type: Set,
        default: () => new Set(),
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
