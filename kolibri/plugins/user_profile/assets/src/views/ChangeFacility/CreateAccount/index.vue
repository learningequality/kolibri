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
    },
    mixins: [commonCoreStrings],
    inject: ['changeFacilityService', 'state'],
    data() {
      return {
        formData: {
          fullName: '',
          username: '',
        },
        isFullNameValid: false,
        isUsernameValid: false,
        isFormSubmitted: false,
      };
    },
    computed: {
      description() {
        return this.$tr('description', {
          targetFacility: get(this.state, 'value.targetFacility.name', ''),
        });
      },
      isFormValid() {
        return [this.isFullNameValid, this.isUsernameValid].every(Boolean);
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
        }
      },
      sendContinue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
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
