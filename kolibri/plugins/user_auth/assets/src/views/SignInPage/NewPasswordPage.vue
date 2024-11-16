<template>

  <AuthBase>
    <div style="text-align: left">
      <KButton
        appearance="basic-link"
        style="margin-bottom: 16px"
        data-test="goback"
        @click="goBack"
      >
        <template #icon>
          <KIcon
            icon="back"
            :style="{
              fill: $themeTokens.primary,
              height: '1.125em',
              width: '1.125em',
              position: 'relative',
              marginRight: '8px',
              top: '2px',
            }"
          />{{ coreString('goBackAction') }}
        </template>
      </KButton>

      <p>{{ $tr('needToMakeNewPasswordLabel', { user: username }) }}</p>

      <PasswordTextbox
        ref="createPassword"
        :autofocus="true"
        :disabled="busy"
        :value.sync="password"
        :isValid.sync="passwordIsValid"
        :shouldValidate="busy"
        @submitNewPassword="updatePassword"
      />
      <KButton
        appearance="raised-button"
        :primary="true"
        :text="coreString('continueAction')"
        style="display: block; width: 100%; margin: 24px auto 0"
        :disabled="busy"
        data-test="submit"
        @click="updatePassword"
      />
    </div>
  </AuthBase>

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AuthBase from '../AuthBase';
  import { ComponentMap } from '../../constants';

  export default {
    name: 'NewPasswordPage',
    components: {
      AuthBase,
      PasswordTextbox,
    },
    mixins: [commonCoreStrings],
    props: {
      username: {
        type: String,
        required: true,
      },
      facilityId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        busy: false,
        password: '',
        passwordIsValid: false,
      };
    },
    computed: {
      credentials() {
        return pickBy({
          username: this.username,
          password: this.password,
          facility: this.facilityId,
          next: this.$route.query.next,
        });
      },
    },
    methods: {
      updatePassword() {
        if (this.passwordIsValid) {
          this.busy = true;
          this.$store
            .dispatch('kolibriSetUnspecifiedPassword', this.credentials)
            .then(() => {
              this.signIn();
            })
            .catch(() => {
              // In case user has already set password or user does not exist,
              // simply go back to the Sign In page.
              this.goBack();
            });
        } else {
          this.$refs.createPassword.focus();
        }
      },
      signIn() {
        this.$store.dispatch('kolibriLogin', this.credentials).catch(() => {
          // In case of an error, we just go back to the Sign In page
          this.goBack();
        });
      },
      goBack() {
        this.$router.push({
          name: ComponentMap.SIGN_IN,
        });
      },
    },
    $trs: {
      needToMakeNewPasswordLabel: {
        message: 'Hi, {user}. You need to set a new password for your account.',
        context: 'Instructions for the user to create a new password.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
