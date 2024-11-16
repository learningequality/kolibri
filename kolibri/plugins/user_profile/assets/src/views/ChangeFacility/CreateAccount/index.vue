<template>

  <div>
    <h1>{{ profileString('createAccount') }}</h1>
    <p>{{ description }}</p>

    <UsernameTextbox
      ref="usernameTextbox"
      data-test="usernameTextbox"
      :autofocus="true"
      :value.sync="formData.username"
      :isValid.sync="isUsernameValid"
      :shouldValidate="isFormSubmitted"
    />
    <PasswordTextbox
      v-if="showPasswordTextbox"
      ref="passwordTextbox"
      data-test="passwordTextbox"
      :value.sync="formData.password"
      :isValid.sync="isPasswordValid"
      :shouldValidate="isFormSubmitted"
    />

    <PrivacyLinkAndModal />

    <p :style="{ color: $themeTokens.annotation }">
      {{ coreString('rememberThisAccountInformation') }}
    </p>

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

  import get from 'lodash/get';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri-common/components/userAccounts/PrivacyLinkAndModal';
  import useUser from 'kolibri/composables/useUser';
  import commonProfileStrings from '../../commonProfileStrings';

  export default {
    name: 'CreateAccount',
    metaInfo() {
      return {
        title: this.profileString('mergeAccounts'),
      };
    },
    components: {
      BottomAppBar,
      UsernameTextbox,
      PasswordTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings, commonProfileStrings],
    setup() {
      const { session } = useUser();
      return { session };
    },
    inject: ['changeFacilityService', 'state'],
    data() {
      return {
        formData: {
          username: '',
          password: '',
        },
        isUsernameValid: false,
        isPasswordValid: false,
        isFormSubmitted: false,
      };
    },
    computed: {
      description() {
        return this.$tr('description', {
          fullName: get(this.session, 'full_name', ''),
          targetFacility: get(this.state, 'value.targetFacility.name', ''),
        });
      },
      showPasswordTextbox() {
        return !get(this.state, 'value.targetFacility.learner_can_login_with_no_password', false);
      },
      isFormValid() {
        return this.isUsernameValid && (!this.showPasswordTextbox || this.isPasswordValid);
      },
    },
    methods: {
      handleContinue() {
        this.isFormSubmitted = true;
        if (this.isFormValid) {
          this.sendContinue();
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        if (!this.isUsernameValid) {
          this.$refs.usernameTextbox.focus();
        } else if (this.showPasswordTextbox && !this.isPasswordValid) {
          this.$refs.passwordTextbox.focus();
        }
      },
      sendContinue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
          value: this.formData,
        });
      },
      sendBack() {
        this.changeFacilityService.send({
          type: 'BACK',
        });
      },
    },
    $trs: {
      description: {
        message: "New account for '{fullName}' in '{targetFacility}' learning facility",
        context: 'When they are changing facility users can choose a new account name.',
      },
    },
  };

</script>
