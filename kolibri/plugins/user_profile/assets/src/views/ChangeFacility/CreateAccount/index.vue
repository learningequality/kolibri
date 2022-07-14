<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ description }}</p>

    <FullNameTextbox
      ref="fullNameTextbox"
      data-test="fullNameTextbox"
      :value.sync="formData.fullName"
      :isValid.sync="isFullNameValid"
      :shouldValidate="isFormSubmitted"
      :autofocus="true"
      autocomplete="name"
    />
    <UsernameTextbox
      ref="usernameTextbox"
      data-test="usernameTextbox"
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

    <BottomAppBar>
      <slot name="buttons">
        <KButtonGroup>
          <KButton
            :primary="false"
            :text="coreString('goBackAction')"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri.coreVue.components.PrivacyLinkAndModal';

  export default {
    name: 'CreateAccount',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      BottomAppBar,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings],
    inject: ['changeFacilityService', 'state'],
    data() {
      return {
        formData: {
          fullName: '',
          username: '',
          password: '',
        },
        isFullNameValid: false,
        isUsernameValid: false,
        isPasswordValid: false,
        isFormSubmitted: false,
      };
    },
    computed: {
      description() {
        return this.$tr('description', {
          targetFacility: get(this.state, 'value.targetFacility.name', ''),
        });
      },
      showPasswordTextbox() {
        return !get(this.state, 'value.targetFacility.learner_can_login_with_no_password', false);
      },
      isFormValid() {
        return (
          this.isFullNameValid &&
          this.isUsernameValid &&
          (!this.showPasswordTextbox || this.isPasswordValid)
        );
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
        if (!this.isFullNameValid) {
          this.$refs.fullNameTextbox.focus();
        } else if (!this.isUsernameValid) {
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
      documentTitle: {
        message: 'Create new account',
        context:
          'Title of the step for creating a new account in a target facility when changing facility.',
      },
      description: {
        message: 'New account for ‘{targetFacility}’ learning facility',
        context:
          'Shows above a new user form where a user can create a new account in a target facility when changing facility.',
      },
    },
  };

</script>
