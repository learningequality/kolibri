<template>

  <!-- The v-if ensures the page isn't visible briefly before redirection -->
  <ImmersivePage
    v-if="!isLearnerOnlyImport"
    icon="close"
    :appBarTitle="$tr('editProfileHeader')"
    :route="profileRoute"
  >
    <KPageContainer
      class="narrow-container"
      :topMargin="100"
    >
      <form
        class="form"
        @submit.prevent="handleSubmit"
      >
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

        <KButtonGroup class="buttons">
          <KButton
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
            @click="handleCancel"
          />
        </KButtonGroup>
      </form>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import every from 'lodash/every';
  import pickBy from 'lodash/pickBy';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import { mapGetters } from 'vuex';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import GenderSelect from 'kolibri-common/components/userAccounts/GenderSelect';
  import BirthYearSelect from 'kolibri-common/components/userAccounts/BirthYearSelect';
  import FullNameTextbox from 'kolibri-common/components/userAccounts/FullNameTextbox';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import useUser from 'kolibri/composables/useUser';
  import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { RoutesMap } from '../constants';

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
      ImmersivePage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { isLearnerOnlyImport, isLearner, currentUserId } = useUser();
      return { isLearnerOnlyImport, isLearner, currentUserId };
    },
    data() {
      return {
        fullName: '',
        fullNameValid: false,
        username: '',
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
      ...mapGetters(['facilityConfig']),
      formDisabled() {
        return this.status === 'BUSY';
      },
      canEditName() {
        if (this.isLearner) {
          return this.facilityConfig.learner_can_edit_name;
        }
        return true;
      },
      canEditUsername() {
        if (this.isLearner) {
          return this.facilityConfig.learner_can_edit_username;
        }
        return true;
      },
      cancelButtonText() {
        return this.coreString('cancelAction');
      },
      formIsValid() {
        return every([this.fullNameValid, this.usernameValid]);
      },
      profileRoute() {
        return this.$router.getRoute(RoutesMap.PROFILE);
      },
    },
    mounted() {
      this.setFacilityUser();
    },
    created() {
      // Users cannot edit profiles on SoUD so redirect them if they get here which should
      // only be possible by direct linking to the URL that leads here
      if (this.isLearnerOnlyImport) {
        redirectBrowser();
      }
    },
    methods: {
      // Have to query FacilityUser again since we don't put demographic info on the session
      setFacilityUser() {
        FacilityUserResource.fetchModel({ id: this.currentUserId }).then(facilityUser => {
          this.birthYear = facilityUser.birth_year;
          this.gender = facilityUser.gender;
          this.fullName = facilityUser.full_name;
          this.username = facilityUser.username;
          this.userCopy = { ...facilityUser };
        });
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
          },
        );
      },
      handleCancel() {
        this.$router.push(this.profileRoute);
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
              this.showSnackbarNotification('changesSaved');
              this.$router.push(this.profileRoute);
            })
            .catch(error => {
              this.status = 'FAILURE';
              this.caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
              if (this.caughtErrors.length > 0) {
                this.focusOnInvalidField();
              } else {
                this.$store.dispatch('handleApiError', { error });
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
      editProfileHeader: {
        message: 'Edit profile',
        context: "Title of the 'Edit profile' page.",
      },
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
    padding: 18px 0;

    button:first-of-type {
      margin-left: 0;
    }
  }

  .select {
    margin: 18px 0 36px;
  }

</style>
