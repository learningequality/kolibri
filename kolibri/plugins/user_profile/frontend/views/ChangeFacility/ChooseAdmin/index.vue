<template>

  <div>
    <h1>{{ pageTitleStrings.documentTitle$() }}</h1>
    <p>{{ $tr('description') }}</p>

    <PaginatedListContainer
      :items="usersWithoutCurrentUser"
      :filterPlaceholder="coreString('searchForUser')"
    >
      <template #default="{ items }">
        <UserTable
          v-model="selectedUsers"
          data-testid="userTable"
          :users="items"
          selectable
          :enableMultipleSelection="false"
        />
      </template>
    </PaginatedListContainer>

    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="coreString('backAction')"
            appearance="flat-button"
            data-testid="backButton"
            @click="sendBack"
          />
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            :disabled="isContinueDisabled"
            data-testid="continueButton"
            @click="sendContinue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import { createTranslator } from 'kolibri/utils/i18n';
  import get from 'lodash/get';
  import { inject, computed, ref } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import UserTable from 'kolibri-common/components/UserTable';

  export const pageTitleStrings = createTranslator('ChooseAdmin', {
    documentTitle: {
      message: 'Choose a new super admin',
      context:
        'Title of the step for choosing a new super admin in a source facility when a user changing facilities is the only super admin of the source facility.',
    },
  });

  export default {
    name: 'ChooseAdmin',
    components: {
      BottomAppBar,
      PaginatedListContainer,
      UserTable,
    },
    mixins: [commonCoreStrings],
    setup() {
      usePageTitle(pageTitleStrings.documentTitle$, { hasVisibleHeading: true });
      const changeFacilityService = inject('changeFacilityService');
      const changeFacilityContext = inject('state');

      const usersWithoutCurrentUser = computed(() => {
        const currentUserId = get(changeFacilityContext, 'value.userId');
        const users = get(changeFacilityContext, 'value.sourceFacilityUsers', []);
        return users.filter(user => user.id !== currentUserId);
      });
      const selectedUsers = ref([]);
      const isContinueDisabled = computed(() => selectedUsers.value.length === 0);

      function sendContinue() {
        if (!isContinueDisabled.value) {
          changeFacilityService.send({
            type: 'SELECTNEWSUPERADMIN',
            value: selectedUsers.value[0],
          });
          changeFacilityService.send({ type: 'CONTINUE' });
        }
      }
      function sendBack() {
        changeFacilityService.send({ type: 'BACK' });
      }

      return {
        pageTitleStrings,
        usersWithoutCurrentUser,
        isContinueDisabled,
        selectedUsers,
        sendContinue,
        sendBack,
      };
    },
    $trs: {
      description: {
        message: 'Choose someone to manage channels and user accounts.',
        context:
          'Description of the step for choosing a new super admin in a source facility when a user changing facilities is the only super admin of the source facility.',
      },
    },
  };

</script>
