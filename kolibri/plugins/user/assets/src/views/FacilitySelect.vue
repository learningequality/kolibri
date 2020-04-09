<template>

  <AuthBase>
    <KRouterLink :to="backTo" :text="coreString('goBackAction')" />
    <div>
      <p>{{ $tr('canSignUpForFacilityLabel') }}</p>
      <div v-for="facility in facilityList['enabled']" :key="facility.id">
        <a href="#" @click.prevent="setFacility(facility.id)">
          {{ facility.name }}
        </a>
      </div>
    </div>
    <div v-if="facilityList['disabled'].length">
      <p>{{ $tr('askAdminForAccountLabel') }}</p>
      <div v-for="facility in facilityList['disabled']" :key="facility.id">
        <div style="color: black; text-decoration:none;">
          {{ facility.name }}
        </div>
      </div>
    </div>
  </AuthBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import partition from 'lodash/partition';
  import { PageNames } from '../constants';
  import AuthBase from './AuthBase';

  export default {
    name: 'FacilitySelect',
    components: { AuthBase },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['facilities']),
      backTo() {
        return this.$router.getRoute(this.$route.query.backTo);
      },
      facilityList() {
        if (this.$route.query.next === PageNames.SIGN_UP) {
          const partitionedFacilities = partition(
            this.facilities,
            f => f.dataset.learner_can_sign_up
          );
          return {
            enabled: partitionedFacilities[0],
            disabled: partitionedFacilities[1],
          };
        } else {
          return { enabled: this.facilities, disabled: [] };
        }
      },
    },
    methods: {
      setFacility(facilityId) {
        console.log(`setting facId ${facilityId}`);
        this.$store.dispatch('setFacilityId', { facilityId }).then(() => {
          this.$router.push({ name: this.$route.query.next });
        });
      },
    },
    $trs: {
      canSignUpForFacilityLabel:
        'Select the facility that you want to associate your new account with:',
      askAdminForAccountLabel: 'Ask your administrator to create an account for these facilities:',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .fh {
    height: 100%;
  }

  .wrapper-table {
    display: table;
    width: 100%;
    height: 100%;
    text-align: center;
  }

  .table-row {
    display: table-row;
  }

  .main-row {
    text-align: center;
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
  }

  .table-cell {
    display: table-cell;
  }

  .main-cell {
    height: 100%;
    vertical-align: middle;
  }

  .box {
    @extend %dropshadow-16dp;

    width: 300px;
    padding: 16px 32px;
    margin: 16px auto;
    border-radius: $radius;
  }

  .login-btn {
    width: calc(100% - 16px);
  }

  .create {
    margin-top: 32px;
    margin-bottom: 8px;
  }

  .guest {
    margin-top: 8px;
    margin-bottom: 16px;
  }

  .small-text {
    font-size: 0.8em;
  }

  .version-string {
    white-space: nowrap;
  }

  .footer-cell {
    @extend %dropshadow-8dp;

    padding: 16px;
  }

  .footer-cell .small-text {
    margin-top: 8px;
  }

  .suggestions-wrapper {
    position: relative;
    width: 100%;
  }

  .suggestions {
    @extend %dropshadow-1dp;

    position: absolute;
    z-index: 8;
    width: 100%;
    padding: 0;
    margin: 0;
    // Move up snug against the textbox
    margin-top: -2em;
    list-style-type: none;
  }

  .textbox-enter-active {
    transition: opacity 0.5s;
  }

  .textbox-enter {
    opacity: 0;
  }

  .list-leave-active {
    transition: opacity 0.1s;
  }

  .textbox-leave {
    transition: opacity 0s;
  }

  .logo {
    width: 100%;
    max-width: 65vh; // not compatible with older browsers
    height: auto;
  }

  .kolibri-title {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 24px;
    font-weight: 100;
  }

  .footer-logo {
    position: relative;
    top: -1px;
    display: inline-block;
    height: 24px;
    margin-right: 10px;
    margin-left: 8px;
    vertical-align: middle;
  }

</style>
