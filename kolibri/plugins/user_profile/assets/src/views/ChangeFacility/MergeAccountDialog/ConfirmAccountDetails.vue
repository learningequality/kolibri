<template>

  <div>
    <h1>{{ $tr('documentTitle') }}</h1>

    {{ confirmAccountUserInfo }}
    <table>
      <tr>
        <th>
          {{ coreString('fullNameLabel') }}
        </th>
        <td data-test="fullname">
          {{ targetAccount.full_name }}
        </td>
      </tr>

      <tr>
        <th>
          {{ coreString('usernameLabel') }}
        </th>
        <td data-test="username">
          {{ targetAccount.username }}
        </td>
      </tr>

      <tr>
        <th>
          {{ coreString('identifierLabel') }}
        </th>
        <td
          dir="auto"
          data-test="idnumber"
        >
          {{ cleanValue(targetAccount.id_number) }}
        </td>
      </tr>
      <tr>
        <th>
          {{ coreString('genderLabel') }}
        </th>
        <td
          dir="auto"
          data-test="gender"
        >
          <GenderDisplayText :gender="targetAccount.gender" />
        </td>
      </tr>
      <tr>
        <th>
          {{ coreString('birthYearLabel') }}
        </th>
        <td
          dir="auto"
          data-test="birthyear"
        >
          <BirthYearDisplayText :birthYear="targetAccount.birth_year" />
        </td>
      </tr>
    </table>

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
            @click="handleContinue"
          />
        </KButtonGroup>
      </slot>
    </BottomAppBar>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { DemographicConstants } from 'kolibri/constants';
  import BottomAppBar from 'kolibri/components/BottomAppBar';
  import GenderDisplayText from 'kolibri-common/components/userAccounts/GenderDisplayText';
  import BirthYearDisplayText from 'kolibri-common/components/userAccounts/BirthYearDisplayText';
  import { computed, inject } from 'vue';
  import get from 'lodash/get';

  export default {
    name: 'ConfirmAccountDetails',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: { BottomAppBar, GenderDisplayText, BirthYearDisplayText },

    mixins: [commonCoreStrings],
    setup() {
      const changeFacilityService = inject('changeFacilityService');
      const state = inject('state');
      const targetAccount = computed(() => get(state, 'value.targetAccount', {}));

      const confirmAccountUserInfo = computed({
        get() {
          return this.$tr('confirmAccountUserInfo', {
            target_facility: get(state, 'value.targetFacility.name', ''),
          });
        },
      });
      function cleanValue(value) {
        return value === DemographicConstants.NOT_SPECIFIED ? '' : value;
      }
      function handleContinue() {
        changeFacilityService.send({
          type: 'CONTINUE',
        });
      }

      function sendBack() {
        changeFacilityService.send({
          type: 'BACK',
        });
      }

      return {
        confirmAccountUserInfo,
        cleanValue,
        sendBack,
        handleContinue,
        targetAccount,
      };
    },
    $trs: {
      documentTitle: {
        message: 'Confirm account details',
        context: 'Title of this step for the change facility page.',
      },
      confirmAccountUserInfo: {
        message:
          "Your account will be merged into this account in '{target_facility}'. You will need to use the username and password for this account from now on.",
        context:
          'Line of text asking for the password of the user to be merged in the target facility.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  h1 {
    margin-bottom: 40px;
  }

  table {
    margin-top: 40px;
    line-height: 1.5em;
    text-align: left;
    table-layout: fixed;
  }

  th {
    min-width: 112px;
    padding-right: 4px;
    padding-bottom: 10px;
  }

  td {
    padding-bottom: 10px;
    padding-left: 40px;
  }

</style>
