<template>

  <ImmersivePage
    :route="$store.getters.facilityPageLinks.UserPage"
    :appBarTitle="coreString('usersLabel')"
    :loading="loading"
  >
    <KPageContainer
      v-if="!loading"
      class="narrow-container"
    >
      <form
        class="form"
        @submit.prevent="submitForm"
      >
        <h1>
          {{ $tr('createNewUserHeader') }}
        </h1>

        <section>
          <FullNameTextbox
            ref="fullNameTextbox"
            :autofocus="true"
            :disabled="busy"
            :value.sync="fullName"
            :isValid.sync="fullNameValid"
            :shouldValidate="formSubmitted"
          />

          <UsernameTextbox
            ref="usernameTextbox"
            :disabled="busy"
            :value.sync="username"
            :isValid.sync="usernameValid"
            :shouldValidate="formSubmitted"
            :isUniqueValidator="usernameIsUnique"
            :errors.sync="caughtErrors"
          />
          <template v-if="showPasswordInput">
            <PasswordTextbox
              ref="passwordTextbox"
              :disabled="busy"
              :value.sync="password"
              :isValid.sync="passwordValid"
              :shouldValidate="formSubmitted"
            />
          </template>
          <KSelect
            v-model="kind"
            class="select"
            :disabled="busy"
            :label="coreString('userTypeLabel')"
            :options="userTypeOptions"
          />

          <fieldset
            v-if="coachIsSelected"
            class="coach-selector"
          >
            <KRadioButtonGroup>
              <KRadioButton
                v-model="classCoachIsSelected"
                :disabled="busy"
                :label="coreString('classCoachLabel')"
                :description="coreString('classCoachDescription')"
                :buttonValue="true"
              />
              <KRadioButton
                v-model="classCoachIsSelected"
                :disabled="busy"
                :label="coreString('facilityCoachLabel')"
                :description="coreString('facilityCoachDescription')"
                :buttonValue="false"
              />
            </KRadioButtonGroup>
          </fieldset>

          <IdentifierTextbox
            :value.sync="idNumber"
            :disabled="busy"
          />

          <BirthYearSelect
            :value.sync="birthYear"
            :disabled="busy"
            class="select"
          />

          <GenderSelect
            :value.sync="gender"
            :disabled="busy"
            class="select"
          />

          <ExtraDemographics
            v-model="extraDemographics"
            :facilityDatasetExtraFields="facilityConfig.extra_fields"
            :disabled="busy"
          />
        </section>

        <div class="buttons">
          <KButtonGroup style="margin-top: 8px">
            <KButton
              type="submit"
              :text="coreString('saveAction')"
              :disabled="busy"
              :primary="true"
            />
            <KButton
              :text="coreString('cancelAction')"
              :disabled="busy"
              @click="goToUserManagementPage()"
            />
          </KButtonGroup>
        </div>
      </form>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import every from 'lodash/every';
  import { mapState, mapGetters, mapActions } from 'vuex';
  import { UserKinds, ERROR_CONSTANTS, DemographicConstants } from 'kolibri/constants';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import GenderSelect from 'kolibri-common/components/userAccounts/GenderSelect';
  import BirthYearSelect from 'kolibri-common/components/userAccounts/BirthYearSelect';
  import FullNameTextbox from 'kolibri-common/components/userAccounts/FullNameTextbox';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ExtraDemographics from 'kolibri-common/components/ExtraDemographics';
  import IdentifierTextbox from './IdentifierTextbox';

  const { NOT_SPECIFIED } = DemographicConstants;

  export default {
    name: 'UserCreatePage',
    metaInfo() {
      return {
        title: this.$tr('createNewUserHeader'),
      };
    },
    components: {
      GenderSelect,
      BirthYearSelect,
      UsernameTextbox,
      FullNameTextbox,
      PasswordTextbox,
      IdentifierTextbox,
      ImmersivePage,
      ExtraDemographics,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        fullName: '',
        fullNameValid: false,
        username: '',
        usernameValid: false,
        password: '',
        passwordValid: false,
        gender: NOT_SPECIFIED,
        birthYear: NOT_SPECIFIED,
        extraDemographics: {},
        idNumber: '',
        loading: true,
        kind: {
          label: this.coreString('learnerLabel'),
          value: UserKinds.LEARNER,
        },
        classCoachIsSelected: true,
        busy: false,
        formSubmitted: false,
        caughtErrors: [],
      };
    },
    computed: {
      ...mapGetters(['activeFacilityId', 'facilityConfig']),
      ...mapState('userManagement', ['facilityUsers']),
      showPasswordInput() {
        if (this.facilityConfig.learner_can_login_with_no_password) {
          return this.kind.value !== UserKinds.LEARNER;
        }
        return true;
      },
      newUserRole() {
        if (this.coachIsSelected) {
          return this.classCoachIsSelected ? UserKinds.ASSIGNABLE_COACH : UserKinds.COACH;
        }
        // Admin or Learner
        return this.kind.value;
      },
      coachIsSelected() {
        return this.kind.value === UserKinds.COACH;
      },
      formIsValid() {
        return every([this.fullNameValid, this.usernameValid, this.passwordValid]);
      },
      userTypeOptions() {
        return [
          {
            label: this.coreString('learnerLabel'),
            value: UserKinds.LEARNER,
          },
          {
            label: this.coreString('coachLabel'),
            value: UserKinds.COACH,
          },
          {
            label: this.coreString('adminLabel'),
            value: UserKinds.ADMIN,
          },
        ];
      },
    },
    beforeMount() {
      this.getFacilityConfig(this.activeFacilityId).then(() => {
        this.$store.dispatch('notLoading');
        this.loading = false;
      });
    },
    methods: {
      ...mapActions(['getFacilityConfig']),
      goToUserManagementPage(onComplete) {
        this.$router.push(this.$store.getters.facilityPageLinks.UserPage, onComplete);
      },
      usernameIsUnique(value) {
        return !this.facilityUsers.find(
          ({ username }) => username.toLowerCase() === value.toLowerCase(),
        );
      },
      submitForm() {
        this.formSubmitted = true;
        let password = this.password;

        if (!this.showPasswordInput) {
          password = NOT_SPECIFIED;
          this.passwordValid = true;
        }

        if (!this.formIsValid) {
          return this.focusOnInvalidField();
        }
        this.busy = true;
        this.$store
          .dispatch('userManagement/createFacilityUser', {
            username: this.username,
            full_name: this.fullName,
            id_number: this.idNumber,
            gender: this.gender,
            birth_year: this.birthYear,
            extra_demographics: this.extraDemographics,
            role: {
              kind: this.newUserRole,
            },
            password,
          })
          .then(() => {
            this.handleSubmitSuccess();
          })
          .catch(error => {
            this.handleSubmitFailure(error);
          });
      },
      handleSubmitSuccess() {
        this.goToUserManagementPage(() => {
          this.showSnackbarNotification('userCreated');
        });
      },
      handleSubmitFailure(error) {
        this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
        this.busy = false;
        if (this.caughtErrors.length > 0) {
          this.focusOnInvalidField();
        } else {
          this.$store.dispatch('handleApiError', { error });
        }
      },
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
      createNewUserHeader: {
        message: 'Create new user',
        context:
          "Refers to the window accessed via the 'New user' button in the Facility > Users section.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .coach-selector {
    padding: 0;
    margin: 0;
    border: 0;
  }

  .select {
    margin: 18px 0 36px;
  }

  .buttons {
    button:first-of-type {
      margin-left: 0;
    }
  }

  .narrow-container {
    max-width: 500px;
    margin: auto;
    overflow: visible;
  }

  .form {
    max-width: 400px;
    margin-right: auto;
    margin-left: auto;
  }

</style>
