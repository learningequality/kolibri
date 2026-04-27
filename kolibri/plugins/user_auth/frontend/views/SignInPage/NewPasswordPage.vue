<template>

  <AuthBase>
    <div class="new-password-content">
      <AuthContextHeading
        :useBackAction="true"
        :backLabel="coreString('goBackAction')"
        :backTo="signInRoute"
      />

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
        data-testid="submit"
        @click="updatePassword"
      />
    </div>
  </AuthBase>

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';
  import { useRoute } from 'vue-router/composables';
  import { setUnspecifiedPassword } from '../../api';
  import AuthBase from '../AuthBase';
  import useAuthRouter from '../../composables/useAuthRouter';
  import AuthContextHeading from '../AuthContextHeading.vue';

  export default {
    name: 'NewPasswordPage',
    components: {
      AuthContextHeading,
      AuthBase,
      PasswordTextbox,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { login } = useUser();
      const route = useRoute();
      const { nextParam, signInRoute } = useAuthRouter(route);
      return { login, nextParam, signInRoute };
    },
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
          next: this.nextParam,
        });
      },
    },
    methods: {
      async updatePassword() {
        if (this.passwordIsValid) {
          this.busy = true;
          try {
            await setUnspecifiedPassword(this.credentials);
            await this.signIn();
          } catch {
            // In case user has already set password or user does not exist,
            // simply go back to the Sign In page.
            this.goBack();
          } finally {
            this.busy = false;
          }
        } else {
          this.$refs.createPassword.focus();
        }
      },
      async signIn() {
        try {
          await this.login(this.credentials);
        } catch {
          // In case of an error, we just go back to the Sign In page
          this.goBack();
        }
      },
      goBack() {
        this.$router.push(this.signInRoute);
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


<style lang="scss" scoped>

  .new-password-content {
    text-align: left;
  }

  .go-back-btn {
    margin-bottom: 16px;
  }

  .go-back-icon {
    position: relative;
    top: 2px;
    width: 1.125em;
    height: 1.125em;
    margin-right: 8px;
  }

</style>
