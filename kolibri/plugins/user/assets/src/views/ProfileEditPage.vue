<template>

  <KPageContainer class="narrow-container">
    <form class="form" @submit.prevent="handleSubmit">
      <h1>{{ $tr('editProfileHeader') }}</h1>

      <FullNameTextbox
        ref="fullNameTextbox"
        :autofocus="true"
        :disabled="!canEditName || formDisabled"
        :value.sync="fullName"
        :isValid.sync="fullNameValid"
        :shouldValidate="formSubmitted"
      />

      <UsernameTextbox
        ref="usernameTextbox"
        :disabled="!canEditUsername || formDisabled"
        :value.sync="username"
        :isValid.sync="usernameValid"
        :shouldValidate="formSubmitted"
        :errors.sync="caughtErrors"
      />

      <GenderSelect
        class="select"
        :value.sync="gender"
        :disabled="formDisabled"
      />

      <BirthYearSelect
        class="select"
        :value.sync="birthYear"
        :disabled="formDisabled"
      />

      <div class="buttons">
        <KButton
          class="no-margin"
          :text="coreString('saveAction')"
          :disabled="formDisabled"
          type="submit"
          primary
        />
        <KButton
          :text="cancelButtonText"
          :disabled="formDisabled"
          appearance="raised-button"
          :primary="false"
          @click="$router.push($router.getRoute('PROFILE'))"
        />
      </div>
    </form>
  </KPageContainer>

</template>


<script>

  import every from 'lodash/every';
  import pickBy from 'lodash/pickBy';
  import { mapGetters } from 'vuex';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import { FacilityUserResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ProfileEditPage',
    metaInfo() {
      return {
        title: this.$tr('editProfileHeader'),
      };
    },
    components: {
      GenderSelect,
      BirthYearSelect,
      FullNameTextbox,
      UsernameTextbox,
    },
    mixins: [commonCoreStrings],
    data() {
      const { username, full_name } = this.$store.state.core.session;
      return {
        fullName: full_name,
        fullNameValid: false,
        username: username,
        usernameValid: false,
        birthYear: '',
        gender: '',
        caughtErrors: [],
        formSubmitted: false,
        status: '',
        userCopy: {},
      };
    },
    computed: {
      ...mapGetters(['facilityConfig', 'isCoach', 'isLearner']),
      formDisabled() {
        return this.status === 'BUSY';
      },
      canEditName() {
        if (this.isLearner || this.isCoach) {
          return this.facilityConfig.learner_can_edit_name;
        }
        return true;
      },
      canEditUsername() {
        if (this.isLearner || this.isCoach) {
          return this.facilityConfig.learner_can_edit_username;
        }
        return true;
      },
      cancelButtonText() {
        return this.status === 'SUCCESS'
          ? this.coreString('closeAction')
          : this.coreString('cancelAction');
      },
      formIsValid() {
        return every([this.fullNameValid, this.usernameValid]);
      },
    },
    mounted() {
      this.setFacilityUser();
    },
    methods: {
      // Have to query FacilityUser again since we don't put demographic info on the session
      setFacilityUser() {
        FacilityUserResource.fetchModel({ id: this.$store.state.core.session.user_id }).then(
          facilityUser => {
            this.birthYear = facilityUser.birth_year;
            this.gender = facilityUser.gender;
            this.userCopy = { ...facilityUser };
          }
        );
      },
      getUpdates() {
        return pickBy(
          {
            birth_year: this.birthYear,
            full_name: this.fullName,
            gender: this.gender,
            username: this.username,
          },
          (value, key) => {
            return value !== this.userCopy[key];
          }
        );
      },
      handleSubmit() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.status = 'BUSY';
          this.$store
            .dispatch('profile/updateUserProfile', {
              updates: this.getUpdates(),
            })
            .then(() => {
              this.status = 'SUCCESS';
              this.$store.dispatch('createSnackbar', this.$tr('updateSuccessNotification'));
            })
            .catch(error => {
              this.status = 'FAILURE';
              this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
              if (this.caughtErrors.length > 0) {
                this.focusOnInvalidField();
              } else {
                this.$store.dispatch('handleApiError', error);
              }
            });
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.fullNameValid) {
            this.$refs.fullNameTextbox.focus();
          } else if (!this.usernameValid) {
            this.$refs.usernameTextbox.focus();
          }
        });
      },
    },
    $trs: {
      editProfileHeader: 'Edit profile',
      updateSuccessNotification: 'Profile details updated',
    },
  };

</script>


<style lang="scss" scoped>

  .narrow-container {
    max-width: 500px;
    margin: auto;
    overflow: visible;
  }

  .form {
    max-width: 400px;
    margin: auto;
  }

  .buttons {
    margin: 36px 0 18px;

    button:first-of-type {
      margin-left: 0;
    }
  }

  .select {
    margin: 18px 0 36px;
  }

</style>
