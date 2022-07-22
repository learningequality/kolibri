<template>

  <OnboardingStepBase
    dir="auto"
    :title="$attrs.header || $tr('adminAccountCreationHeader')"
    :description="$attrs.description || $tr('adminAccountCreationDescription')"
    @continue="handleContinue"
  >
    <slot name="aboveform"></slot>

    <!-- HACK in Import mode, this slot will be replaced by Password-only form -->
    <!-- VUE3-COMPAT: linter doesn't like that we are injecting "footer" slot from
         inside a slot default
    -->
    <slot name="form">
      <FullNameTextbox
        ref="fullNameTextbox"
        :value.sync="fullName"
        :isValid.sync="fullNameValid"
        :shouldValidate="formSubmitted"
        :autofocus="true"
        autocomplete="name"
      />

      <UsernameTextbox
        ref="usernameTextbox"
        :value.sync="username"
        :isValid.sync="usernameValid"
        :shouldValidate="formSubmitted"
        :isUniqueValidator="uniqueUsernameValidator"
      />

      <PasswordTextbox
        ref="passwordTextbox"
        :value.sync="password"
        :isValid.sync="passwordValid"
        :shouldValidate="formSubmitted"
        autocomplete="new-password"
      />

      <!-- NOTE: Demographic info forms were removed in PR #6053 -->

      <PrivacyLinkAndModal v-if="!hidePrivacyLink" />

    </slot>

    <slot name="footer">
      <div class="reminder">
        <div class="icon">
          <KIcon icon="warning" />
        </div>
        <p class="text">
          {{ coreString('rememberThisAccountInformation') }}
        </p>
      </div>
    </slot>
  </OnboardingStepBase>

</template>


<script>

  import every from 'lodash/every';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri.coreVue.components.PrivacyLinkAndModal';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { FacilityImportResource } from '../../api';

  export default {
    name: 'SuperuserCredentialsForm',
    components: {
      OnboardingStepBase,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings],
    inject: ['wizardService'],
    props: {
      uniqueUsernameValidator: {
        type: Function,
        default: null,
      },
      hidePrivacyLink: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      const { superuser } = this.$store.state.onboardingData;
      return {
        fullName: superuser.full_name,
        fullNameValid: false,
        username: superuser.username,
        usernameValid: false,
        password: superuser.password,
        passwordValid: false,
        formSubmitted: false,
      };
    },
    computed: {
      formIsValid() {
        return every([this.usernameValid, this.fullNameValid, this.passwordValid]);
      },
    },
    methods: {
      handleContinue() {
        const data = {
          fullName: this.fullName,
          username: this.username,
          password: this.password,
        };
        if (this.formIsValid) {
          return FacilityImportResource.createsuperuser(data)
            .then(() => {
              //this.updateSuperuserAndClickNext(data.username, data.password);
            })
            .catch(e => {
              throw new Error(`Error creating superuser: ${e}`);
            });
        } else {
          this.focusOnInvalidField();
        }
      },
      // FIXME this breaks because the facility isn't created yet, this bit of the logic
      // is TBD -- the old method kept as some functionality may be preserved
      // Note that the process is currently gathering deferring the actual provisioning of
      // everything to the end, hence why no facility here yet. Not sure how we'll proceed here yet
      /*
      handleSubmit() {
        if (!this.$refs.fullNameTextbox) {
          return this.$emit('click_next');
        }
        this.formSubmitted = true;
        // Have to wait a tick to let inputs react to this.formSubmitted
        this.$nextTick().then(() => {
          if (this.formIsValid) {
            this.$store.commit('SET_SUPERUSER_CREDENTIALS', {
              full_name: this.fullName,
              username: this.username,
              password: this.password,
            });
            this.$emit('click_next', {
              full_name: this.fullName,
              username: this.username,
              password: this.password,
            });
          } else {
            this.focusOnInvalidField();
          }
        });
      },
      */
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.fullNameValid) {
            this.$refs.fullNameTextbox.focus();
          } else if (!this.usernameValid) {
            this.$refs.usernameTextbox.focus();
          } else if (!this.passwordValid) {
            this.$refs.passwordTextbox.focus();
          }
        });
      },
    },
    $trs: {
      adminAccountCreationHeader: {
        message: 'Create super admin account',
        context:
          "The title of the 'Create a super admin account' section. A super admin can manage all the content and all other Kolibri users on the device.",
      },
      adminAccountCreationDescription: {
        message:
          'This account allows you to manage the facility, resources, and user accounts on this device',
        context: "Description of the 'Create super admin account' page.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .reminder {
    display: table;
    max-width: 480px;
    padding-top: 1em;

    .icon {
      display: table-cell;
      width: 5%;
      min-width: 32px;
    }

    .text {
      display: table-cell;
      width: 90%;
      vertical-align: top;
    }
  }

  .select {
    margin: 18px 0 36px;
  }

</style>
