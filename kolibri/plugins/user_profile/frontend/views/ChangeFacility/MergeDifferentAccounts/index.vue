<template>

  <div>
    <h1>{{ profileString('mergeAccounts') }}</h1>
    <p
      class="fullname"
      data-test="fullName"
    >
      {{ fullName }}
    </p>
    <p
      class="username"
      data-test="username"
      :style="{ color: $themeTokens.annotation }"
    >
      {{ username }}
    </p>
    {{ $tr('mergeAccountUserInfo') }}

    <KTextbox
      v-model="formData.username"
      data-test="usernameTextbox"
      :autofocus="true"
      autocomplete="off"
      :label="coreString('usernameLabel')"
      :invalid="userDoesNotExist"
      :showInvalidText="true"
      :invalidText="$tr('userDoesNotExist')"
      @input="userDoesNotExist = false"
      @keydown.enter="handleContinue"
    />

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
            data-test="continueButton"
            @click="handleContinue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import { computed, inject, ref } from 'vue';
  import get from 'lodash/get';
  import { remoteFacilityUsers } from '../../../composables/useRemoteFacility';
  import commonProfileStrings from '../../commonProfileStrings';

  export default {
    name: 'MergeDifferentAccounts',
    metaInfo() {
      return {
        title: this.profileString('mergeAccounts'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings, commonProfileStrings],
    setup() {
      const changeFacilityService = inject('changeFacilityService');
      const state = inject('state');

      const isFormSubmitted = ref(false);
      const userDoesNotExist = ref(false);

      const fullName = computed(() => get(state, 'value.fullname', ''));
      const username = computed(() => get(state, 'value.username', ''));
      const formData = ref({
        username: '',
      });

      function handleContinue() {
        const facility = get(state, 'value.targetFacility', {});
        remoteFacilityUsers(facility.url, facility.id, formData.value.username.trim()).then(
          user_info => {
            if (user_info.users.length === 0) {
              // there are not users matching that username
              userDoesNotExist.value = true;
            } else {
              isFormSubmitted.value = false;
              changeFacilityService.send({
                type: 'CONTINUE',
                // set TargetAccount
                value: { username: formData.value.username.trim(), password: '' },
              });
            }
          },
        );
      }

      function sendBack() {
        changeFacilityService.send({
          type: 'BACK',
        });
      }

      return {
        formData,
        userDoesNotExist,
        username,
        fullName,
        sendBack,
        handleContinue,
      };
    },
    $trs: {
      mergeAccountUserInfo: {
        message: 'Enter the username of the account you want to merge your account into.',
        context:
          'Line of text asking for the username of the user to be merged in the target facility.',
      },
      userDoesNotExist: {
        message: 'That username does not exist in the target facility',
        context:
          'Error that is shown if the selected username does not exist in the target facility',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .fullname {
    margin-bottom: 0;
    font-size: 1em;
  }

  .username {
    margin-top: 0;
    margin-bottom: 40px;
    font-size: 0.95em;
  }

</style>
