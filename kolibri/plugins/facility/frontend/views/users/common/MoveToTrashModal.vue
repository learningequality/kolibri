<template>

  <div>
    <KModal :title="moveToTrashLabel$({ num: selectedUsers.size })">
      <KCircularLoader v-if="loading" />
      <div
        v-else
        class="fix-line-height"
      >
        <KLabeledIcon
          v-if="adminUsers.length"
          icon="infoOutline"
          :color="$themeTokens.error"
          :style="{ marginBottom: '8px' }"
        >
          <span :style="{ color: $themeTokens.error }">
            {{ numAdminsSelected$({ num: adminUsers.length }) }}
          </span>
        </KLabeledIcon>
        <p
          :style="{
            marginLeft: adminUsers.length ? '32px' : '0',
            margin: 0,
          }"
        >
          {{ moveToTrashWarning$() }}
        </p>
      </div>
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
          :text="moveToTrashAction$()"
          @click="moveToTrash"
        />
      </template>
    </KModal>
  </div>

</template>


<script>

  import { computed, ref } from 'vue';
  import { darken1 } from 'kolibri-design-system/lib/styles/darkenColors';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  import { UserKinds } from 'kolibri/constants';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import DeletedFacilityUserResource from 'kolibri-common/apiResources/DeletedFacilityUserResource';

  import { _userState } from '../../../modules/mappers';
  import useActionWithUndo from '../../../composables/useActionWithUndo';

  export default {
    name: 'MoveToTrashModal',
    setup(props, { emit }) {
      const { createSnackbar } = useSnackbar();
      const { sendPoliteMessage } = useKLiveRegion();

      const loading = ref(false);
      const users = ref([]);
      const usersRemoved = ref(null);

      const {
        actionSuccessful$,
        movingToTrash$,
        moveToTrashAction$,
        moveToTrashLabel$,
        numAdminsSelected$,
        usersTrashedNotice$,
        moveToTrashWarning$,
        defaultErrorMessage$,
      } = bulkUserManagementStrings;

      const adminUsers = computed(() => {
        return users.value.filter(user =>
          [UserKinds.ADMIN, UserKinds.SUPERUSER].includes(user.kind),
        );
      });

      const loadData = async () => {
        loading.value = true;
        try {
          const userModels = await FacilityUserResource.fetchCollection({
            getParams: {
              by_ids: Array.from(props.selectedUsers),
            },
          });
          users.value = userModels.map(_userState);
        } finally {
          loading.value = false;
        }
      };

      const close = () => {
        emit('close');
      };

      const _moveToTrash = async () => {
        loading.value = true;
        sendPoliteMessage(movingToTrash$());
        try {
          await FacilityUserResource.deleteCollection({
            by_ids: Array.from(props.selectedUsers).join(','),
          });
          createSnackbar(usersTrashedNotice$());
          loading.value = false;
          usersRemoved.value = Array.from(props.selectedUsers);
          props.onChange({ resetSelection: true });
          close();
          return true;
        } catch (error) {
          createSnackbar(defaultErrorMessage$());
          loading.value = false;
          return false;
        }
      };

      const undoMoveToTrash = async () => {
        await DeletedFacilityUserResource.restoreCollection({
          by_ids: usersRemoved.value.join(','),
        });
        createSnackbar(actionSuccessful$());
        props.onChange();
      };

      const { performAction: moveToTrash } = useActionWithUndo({
        action: _moveToTrash,
        actionNotice$: usersTrashedNotice$,
        undoAction: undoMoveToTrash,
        undoActionNotice$: actionSuccessful$,
        onBlur: props.onBlur,
      });

      const removeButtonStyles = {
        color: themeTokens().textInverted,
        backgroundColor: themePalette().red.v_600,
        ':hover': { backgroundColor: darken1(themePalette().red.v_600) },
      };

      if (props.selectedUsers.size > 0) {
        loadData();
      } else {
        close();
      }

      return {
        // ref and computed properties
        loading,
        coreStrings,
        adminUsers,
        removeButtonStyles,

        // methods
        close,
        moveToTrash,

        // translation functions
        moveToTrashAction$,
        moveToTrashLabel$,
        numAdminsSelected$,
        moveToTrashWarning$,
      };
    },
    props: {
      selectedUsers: {
        type: Set,
        default: () => new Set(),
      },
      onBlur: {
        type: Function,
        default: () => {},
      },
      onChange: {
        type: Function,
        default: () => {},
      },
    },
  };

</script>


<style lang="scss" scoped>

  .fix-line-height {
    line-height: 1.5;
  }

</style>
