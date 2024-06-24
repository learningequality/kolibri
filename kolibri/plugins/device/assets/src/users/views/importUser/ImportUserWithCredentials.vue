<template>

  <ImmersivePage
    :primary="false"
    :appBarTitle="deviceString('importUserLabel')"
    :loading="loadingNewAddress"
    @navIconClick="importUserService.send('RESET_IMPORT')"
  >
    <KPageContainer class="device-container">
      <KCircularLoader v-if="!facility" />

      <div v-else>
        <h1>
          {{ deviceString('importUserLabel') }}
        </h1>
        <p>{{ $tr('enterCredentials') }}</p>
        <p v-if="error && !useAdmin" :style="{ color: $themeTokens.error }">
          {{ coreString('invalidCredentialsError') }}
        </p>
        <KTextbox
          ref="usernameTextbox"
          v-model.trim="username"
          :disabled="formSubmitted"
          :label="coreString('usernameLabel')"
          :autofocus="$attrs.autofocus"
          :invalid="Boolean(invalidText)"
          :invalidText="invalidText"
          @blur="shouldValidate = true"
        />
        <PasswordTextbox
          v-if="!facility.learner_can_login_with_no_password"
          ref="passwordTextbox"
          :disabled="formSubmitted"
          :value.sync="password"
          :showConfirmationInput="false"
          autocomplete="new-password"
        />
        <p>
          {{ $tr('doNotHaveUserCredentials') }}
          <KButton
            :text="profileString('useAdminAccount')"
            appearance="basic-link"
            @click="openAdminCredentialsForm"
          />
        </p>

        <KModal
          v-if="deviceLimitations"
          :title="$tr('deviceLimitationsTitle') "
          :cancelText="coreString('cancelAction')"
          :submitText="coreString('importAction')"
          @cancel="closeModal"
          @submit="importUser"
        >
          <p> {{ modalMessage }} </p>
        </KModal>

        <KModal
          v-if="useAdmin"
          :title="profileString('useAdminAccount')"
          :cancelText="coreString('cancelAction')"
          :submitText="coreString('continueAction')"
          @cancel="closeModal"
          @submit="moveAdmin"
        >
          <p> {{ adminModalMessage }} </p>
          <p v-if="error && useAdmin" :style="{ color: $themeTokens.error }">
            {{ coreString('invalidCredentialsError') }}
          </p>
          <KTextbox
            ref="adminUsernameTextbox"
            v-model.trim="adminUsername"
            :label="coreString('usernameLabel')"
            :autofocus="$attrs.autofocus"
            :invalid="Boolean(invalidText)"
            :invalidText="invalidText"
            @blur="shouldValidate = true"
          />
          <PasswordTextbox
            ref="adminPasswordTextbox"
            :value.sync="adminPassword"
            :showConfirmationInput="false"
            autocomplete="new-password"
          />
        </KModal>
      </div>
      <BottomAppBar>
        <KButton
          :text="coreString('continueAction')"
          :primary="true"
          :disabled="formSubmitted || !!invalidText"
          @click="handleSubmit"
        />
      </BottomAppBar>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import get from 'lodash/get';
  import { currentLanguage } from 'kolibri.utils.i18n';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { DemographicConstants, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import { TaskResource } from 'kolibri.resources';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import { FacilityImportResource } from '../../apiResources';
  import commonProfileStrings from '../../../../../../user_profile/assets/src/views/commonProfileStrings';
  import commonDeviceStrings from '../../../views/commonDeviceStrings';

  export default {
    name: 'ImportUserWithCredentials',
    components: {
      BottomAppBar,
      ImmersivePage,
      PasswordTextbox,
    },
    mixins: [commonSyncElements, commonCoreStrings, commonProfileStrings, commonDeviceStrings],
    data() {
      return {
        username: '',
        password: '',
        full_name: '',
        roles: '',
        error: false,
        deviceLimitations: false,
        useAdmin: false,
        forceNonLearnerImport: false,
        adminUsername: null,
        adminPassword: null,
        device: null,
        facilities: [],
        selectedFacilityId: 'selectedFacilityId',
        formSubmitted: false,
        shouldValidate: false,
      };
    },
    inject: ['importUserService'],
    computed: {
      deviceId() {
        return this.importUserService.state.context.importDeviceId;
      },
      facility() {
        return this.facilities.find(f => f.id === this.selectedFacilityId);
      },
      modalMessage() {
        const importedUserIsAdmin = this.roles && this.roles.includes('admin');

        const messageArgs = {
          full_name: this.full_name,
          username: this.username,
          non_admin_role:
            !importedUserIsAdmin &&
            this.coreString('coachLabel').toLocaleLowerCase(currentLanguage),
          device: this.device.name,
        };

        if (importedUserIsAdmin) {
          return this.$tr('deviceLimitationsAdminsMessage', messageArgs);
        } else {
          return this.$tr('deviceLimitationsMessage', messageArgs);
        }
      },
      adminModalMessage() {
        return this.$tr('enterAdminCredentials', { facility: this.facility.name });
      },
      invalidText() {
        if (!this.shouldValidate) {
          return '';
        }
        if (
          !this.useAdmin & (this.username.trim() === '') ||
          this.useAdmin & (this.adminUsername === null || this.adminUsername.trim() === '')
        ) {
          return this.coreString('requiredFieldError');
        }
        return '';
      },
    },
    beforeMount() {
      this.fetchNetworkLocation(this.deviceId).then(() => {
        if (!this.facility) {
          this.$store.dispatch('showError', 'Failed to retrieve facilities.');
        }
      });
    },
    mounted() {
      this.selectedFacilityId = this.importUserService.state.context.selectedFacility.id;
    },
    methods: {
      fetchNetworkLocation(deviceId) {
        this.loadingNewAddress = true;
        return this.fetchNetworkLocationFacilities(deviceId)
          .then(data => {
            this.facilities = [...data.facilities];
            this.device = {
              name: data.device_name,
              id: data.device_id,
              baseurl: data.device_address,
            };
            this.loadingNewAddress = false;
            this.$store.dispatch('notLoading');
          })
          .catch(error => {
            // TODO handle disconnected peers error more gracefully
            this.$store.dispatch('showError', error);
          });
      },
      closeModal() {
        this.deviceLimitations = false;
        this.useAdmin = false;
      },
      openAdminCredentialsForm() {
        // clean error from non-admin form:
        this.shouldValidate = false;
        this.error = false;

        this.useAdmin = true;
        this.$nextTick(function() {
          this.$refs.adminUsernameTextbox.focus();
        });
      },
      async handleSubmit() {
        this.shouldValidate = true;
        if (this.invalidText) {
          this.$refs.usernameTextbox.focus();
          return;
        }
        this.formSubmitted = true;
        const task_name = 'kolibri.core.auth.tasks.peeruserimport';
        const password = this.password || DemographicConstants.NOT_SPECIFIED;
        const params = {
          type: task_name,
          username: this.username,
          password,
          facility: this.facility.id,
          facility_name: this.facility.name,
          device_id: this.deviceId,
          using_admin: false,
          force_non_learner_import: this.forceNonLearnerImport,
        };
        try {
          const response = await TaskResource.startTask(params);
          const { user_id: userId, username } = response.extra_metadata;
          this.importUserService.send({
            type: 'ADD_USER_BEING_IMPORTED',
            value: {
              id: userId,
              full_name: username,
              username,
            },
          });
          this.importUserService.send({
            type: 'RESET_IMPORT',
          });
        } catch (error) {
          this.formSubmitted = false;
          const errorsCaught = CatchErrors(error, [
            ERROR_CONSTANTS.INVALID_CREDENTIALS,
            ERROR_CONSTANTS.MISSING_PASSWORD,
            ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
            ERROR_CONSTANTS.AUTHENTICATION_FAILED,
            ERROR_CONSTANTS.INVALID_USERNAME,
          ]);

          const errorData = error.response.data;

          if (errorsCaught) {
            this.error = true;
          } else if (
            Array.isArray(errorData) &&
            errorData.find(
              e => get(e, 'metadata.message', null) === ERROR_CONSTANTS.DEVICE_LIMITATIONS
            )
          ) {
            const error_info = errorData.reduce((info, err) => {
              const { field, message } = err.metadata;
              info[field] = message;
              return info;
            }, {});
            this.full_name = error_info['full_name'];
            this.roles = error_info['roles'];
            this.deviceLimitations = true;
          }
        }
      },
      importUser() {
        this.forceNonLearnerImport = true;
        this.error = false;
        this.handleSubmit();
      },
      moveAdmin() {
        this.shouldValidate = true;
        if (this.invalidText) {
          this.$refs.adminUsernameTextbox.focus();
          return;
        }
        const params = {
          baseurl: this.device.baseurl,
          username: this.adminUsername,
          password: this.adminPassword,
          facility_id: this.facility.id,
        };
        FacilityImportResource.listfacilitylearners(params)
          .then(data => {
            this.importUserService.send({
              type: 'CONTINUEADMIN',
              value: {
                adminUsername: this.adminUsername,
                adminPassword: this.adminPassword,
                adminId: data.admin.id,
                users: data.students,
              },
            });
          })
          .catch(error => {
            const errorsCaught = CatchErrors(error, [
              ERROR_CONSTANTS.INVALID_CREDENTIALS,
              ERROR_CONSTANTS.AUTHENTICATION_FAILED,
              ERROR_CONSTANTS.PERMISSION_DENIED,
              ERROR_CONSTANTS.MISSING_PASSWORD,
              ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
              ERROR_CONSTANTS.INVALID_USERNAME,
            ]);
            if (errorsCaught) {
              this.error = true;
            } else this.$store.dispatch('handleApiError', { error });
          });
      },
    },
    $trs: {
      enterCredentials: {
        message: 'Enter the user credentials of the account you want to import.',
        context: 'Asking user and password of the user to be imported.',
      },
      enterAdminCredentials: {
        message:
          "Enter the username and password of a facility admin or a super admin of '{facility}'",
        context: 'Asking user and password of the  admin user of the facility to be imported',
      },
      deviceLimitationsTitle: {
        message: 'Device limitations',
        context:
          'Heading for the window which informs that only learner features will be available on the device. ',
      },
      deviceLimitationsMessage: {
        message:
          "'{full_name} ({username})' is a {non_admin_role} on '{device}'. This device is limited to features for learners only. Features for coaches and admins will not be available.",

        context:
          "Appears on 'Device limitations' window which informs that only learner features will be available on the device.",
      },
      /* eslint-disable kolibri/vue-no-unused-translations */
      deviceLimitationsAdminsMessage: {
        message:
          "'{full_name} ({username})' is an admin on '{device}'. This device is limited to features for learners only. Features for coaches and admins will not be available.",
      },
      /* eslint-enable */
      doNotHaveUserCredentials: {
        message: "Don't have the user credentials?",
        context: "'Credentials' refers to learner's username and password.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .facility-name {
    font-weight: bold;
  }

</style>
