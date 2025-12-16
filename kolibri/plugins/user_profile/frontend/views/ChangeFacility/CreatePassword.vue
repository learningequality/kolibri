<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>
    <p>{{ description }}</p>
    <p>{{ $tr('hint') }}</p>
    <PasswordTextbox
      ref="passwordTextbox"
      data-test="passwordTextbox"
      :value.sync="formData.password"
      :isValid.sync="isPasswordValid"
      :shouldValidate="isFormSubmitted"
    />

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
            :disabled="!isPasswordValid"
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
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import useUser from 'kolibri/composables/useUser';

  export default {
    name: 'CreatePassword',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      BottomAppBar,
      PasswordTextbox,
    },
    mixins: [commonCoreStrings],
    inject: ['changeFacilityService', 'state'],
    setup() {
      const { session } = useUser();
      return { session };
    },
    data() {
      return {
        formData: {
          password: '',
        },
        isPasswordValid: false,
        isFormSubmitted: false,
      };
    },
    computed: {
      description() {
        return this.$tr('description', {
          username: get(this.session, 'username', ''),
          targetFacility: get(this.state, 'targetFacility.name', ''),
        });
      },
    },
    methods: {
      handleContinue() {
        this.isFormSubmitted = true;
        if (this.isPasswordValid) {
          this.sendContinue();
        } else {
          this.$refs.passwordTextbox.focus();
        }
      },
      sendContinue() {
        this.changeFacilityService.send({
          type: 'CONTINUE',
          value: {
            username: get(this.state, 'targetAccount.username', ''),
            password: this.formData.password,
          },
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
        message: 'Create new password',
        context:
          'Title of the step for creating a new password for the user in the target facility when changing facility.',
      },
      description: {
        message:
          '‘{targetFacility}’ requires accounts to have passwords. Enter a password that you would like to use for ‘{username}’ in ‘{targetFacility}’',
        context: 'Explains why a password must be created.',
      },
      hint: {
        message: 'You can enter your current password if you already have one.',
      },
    },
  };

</script>
