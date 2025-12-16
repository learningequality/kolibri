<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ $tr('description') }}</p>

    <PaginatedListContainer
      :items="usersWithoutCurrentUser"
      :filterPlaceholder="coreString('searchForUser')"
    >
      <template #default="{ items }">
        <UserTable
          v-model="selectedUsers"
          data-test="userTable"
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
            data-test="backButton"
            @click="sendBack"
          />
          <KButton
            :primary="true"
            :text="coreString('continueAction')"
            :disabled="isContinueDisabled"
            data-test="continueButton"
            @click="sendContinue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import get from 'lodash/get';
  import { inject, computed, ref } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import UserTable from 'kolibri-common/components/UserTable';

  export default {
    name: 'ChooseAdmin',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      BottomAppBar,
      PaginatedListContainer,
      UserTable,
    },
    mixins: [commonCoreStrings],
    setup() {
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
        usersWithoutCurrentUser,
        isContinueDisabled,
        selectedUsers,
        sendContinue,
        sendBack,
      };
    },
    $trs: {
      documentTitle: {
        message: 'Choose a new super admin',
        context:
          'Title of the step for choosing a new super admin in a source facility when a user changing facilities is the only super admin of the source facility.',
      },
      description: {
        message: 'Choose someone to manage channels and user accounts.',
        context:
          'Description of the step for choosing a new super admin in a source facility when a user changing facilities is the only super admin of the source facility.',
      },
    },
  };

</script>
