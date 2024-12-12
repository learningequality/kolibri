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
    <span v-if="usingAdminPasswordState">
      <p>{{ mergeAccountUsingAdminAccount }}</p>

      <KTextbox
        v-model="formData.username"
        data-test="usernameTextbox"
        :autofocus="true"
        :label="coreString('usernameLabel')"
      />
    </span>
    <p v-else>
      {{ mergeAccountUserInfo }}
    </p>
    <KTextbox
      v-if="showPasswordTextbox"
      ref="passwordTextbox"
      v-model="formData.password"
      data-test="passwordTextbox"
      type="password"
      :label="coreString('passwordLabel')"
      :autofocus="true"
      :invalid="isPasswordInvalid"
      :invalidText="$tr('incorrectPasswordError')"
      :floatingLabel="false"
      @keydown.enter="handleContinue"
    />
    <div v-if="!usingAdminPasswordState">
      {{ $tr('doNotKnowPassword') }}
      <KButton
        data-test="useAdminAccount"
        :text="profileString('useAdminAccount')"
        appearance="basic-link"
        @click="useAdminAccount"
      />
    </div>
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
  import { computed, inject, ref, watch } from 'vue';
  import get from 'lodash/get';
  import remoteFacilityUserData from '../../../composables/useRemoteFacility';
  import commonProfileStrings from '../../commonProfileStrings';

  export default {
    name: 'MergeAccountDialog',
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
      const isPasswordInvalid = ref(false);
      const usingAdminPasswordState = ref(false);
      const fullName = computed(() => get(state, 'value.fullname', ''));
      const username = computed(() => get(state, 'value.username', ''));
      const formData = ref({
        username: get(state, 'value.username', ''),
        password: '',
      });

      watch(changeFacilityService, currentValue => {
        if (currentValue.state.value === 'useAdminPassword') {
          usingAdminPasswordState.value = true;
          formData.value['username'] = '';
        } else {
          usingAdminPasswordState.value = false;
          formData.value['username'] = get(state, 'value.username', '');
        }
      });

      const mergeAccountUserInfo = computed({
        get() {
          return this.$tr('mergeAccountUserInfo', {
            target_facility: get(state, 'value.targetFacility.name', ''),
            username: get(state, 'value.targetAccount.username', ''),
          });
        },
      });
      const mergeAccountUsingAdminAccount = computed({
        get() {
          return this.$tr('mergeAccountUsingAdminAccount', {
            target_facility: get(state, 'value.targetFacility.name', ''),
          });
        },
      });

      function showPasswordTextbox() {
        return !get(state, 'value.targetFacility.learner_can_login_with_no_password', false);
      }

      function focusOnInvalidField(component) {
        if (showPasswordTextbox && isPasswordInvalid.value) {
          component.$refs.passwordTextbox.focus();
        }
      }

      function sendContinue(data) {
        if (usingAdminPasswordState.value) {
          data['username'] = get(state, 'value.targetAccount.username', '');
          data['password'] = null;
          data['AdminUsername'] = formData.value.username;
          data['AdminPassword'] = formData.value.password;
        } else data['password'] = formData.value.password;
        changeFacilityService.send({
          type: 'CONTINUE',
          value: data,
        });
      }

      function handleContinue() {
        const facility = get(state, 'value.targetFacility', {});
        const component = this;
        remoteFacilityUserData(
          facility.url,
          facility.id,
          get(state, 'value.targetAccount.username', ''),
          formData.value.password,
          usingAdminPasswordState.value ? formData.value.username : null,
        ).then(user_info => {
          if (user_info === 'error') {
            isPasswordInvalid.value = true;
            focusOnInvalidField(component);
          } else {
            isPasswordInvalid.value = false;
            isFormSubmitted.value = true;
            sendContinue(user_info);
          }
        });
      }

      function useAdminAccount() {
        changeFacilityService.send({
          type: 'USEADMIN',
        });
      }

      function sendBack() {
        changeFacilityService.send({
          type: 'BACK',
        });
      }

      return {
        formData,
        isPasswordInvalid,
        usingAdminPasswordState,
        username,
        fullName,
        mergeAccountUserInfo,
        mergeAccountUsingAdminAccount,
        showPasswordTextbox,
        useAdminAccount,
        sendBack,
        handleContinue,
      };
    },
    $trs: {
      mergeAccountUserInfo: {
        message:
          "Enter the password of the account '{username}' in '{target_facility}' learning facility that you want to merge your account with.",
        context:
          'Line of text asking for the password of the user to be merged in the target facility.',
      },
      mergeAccountUsingAdminAccount: {
        message:
          "Enter the username and password of a facility admin or a super admin for '{target_facility}' learning facility.",
        context:
          'Line of text asking for the credentials of an admin account in the target facility.',
      },
      doNotKnowPassword: {
        message: "Don't know the password?",
        context:
          'Giving an option if the user does not know the password for this user in the target facility',
      },
      incorrectPasswordError: {
        message: 'Incorrect password',
        context: 'Error that is shown if the user provides the wrong password.',
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
