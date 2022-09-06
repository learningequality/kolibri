<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p class="fullname" data-test="fullName">
      {{ fullName }}
    </p>
    <p class="username" data-test="username" :style="{ color: $themeTokens.annotation }">
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
        :text="$tr('useAdminAccount')"
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import { computed, inject, ref, watch } from 'kolibri.lib.vueCompositionApi';
  import get from 'lodash/get';
  import remoteFacilityUserData from '../../../composables/useRemoteFacility';

  export default {
    name: 'MergeAccountDialog',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar },

    mixins: [commonCoreStrings],
    setup(_, context) {
      const changeFacilityService = inject('changeFacilityService');
      const state = inject('state');

      const isFormSubmitted = ref(false);
      const isPasswordInvalid = ref(false);
      const usingAdminPasswordState = ref(false);
      // hack to get the $store in vue tests with composition api:
      const store =
        context.root.$store !== undefined ? context.root.$store : context.root.$children[0].$store;
      const session = store.getters['session'];
      const fullName = computed(() => session.full_name);
      const username = computed(() => session.username);
      const stateName = computed(() => changeFacilityService.state.value);
      const formData = ref({
        username: session.username,
        password: '',
      });

      watch(changeFacilityService, currentValue => {
        usingAdminPasswordState.value = currentValue.state.value === 'useAdminPassword';
      });

      const mergeAccountUserInfo = computed({
        get() {
          return this.$tr('mergeAccountUserInfo', {
            target_facility: get(state, 'value.targetFacility.name', ''),
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
          data['username'] = username.value;
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
          username.value,
          formData.value.password,
          usingAdminPasswordState.value ? formData.value.username : null
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
        isFormSubmitted,
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
        stateName,
      };
    },
    $trs: {
      documentTitle: {
        message: 'Merge Accounts',
        context: 'Title of this step for the change facility page.',
      },
      mergeAccountUserInfo: {
        message:
          'Enter the password of the account in ‘{target_facility}’ learning facility that you want to merge your account with.',
        context:
          'Line of text asking for the password of the user to be merged in the target facility.',
      },
      mergeAccountUsingAdminAccount: {
        message:
          'Enter the username and password of a facility admin or a super admin for ‘{target_facility}’ learning facility.',
        context:
          'Line of text asking for the credentials of an admin account in the target facility.',
      },
      doNotKnowPassword: {
        message: 'Don’t know the password?',
        context:
          'Giving an option if the user does not know the password for this user in the target facility',
      },
      useAdminAccount: {
        message: 'Use an admin account',
        context: 'Link to use an admin account for the target facility to do the merge',
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
