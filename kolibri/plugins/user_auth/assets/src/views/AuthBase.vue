<template>

  <div class="fh">
    <div class="wrapper-table">
      <div class="main-row table-row">
        <div class="main-cell table-cell">
          <!-- remote access disabled -->
          <div
            v-if="!$store.getters.allowAccess"
            class="box"
            :style="{ backgroundColor: $themeTokens.surface }"
          >
            <CoreLogo
              v-if="themeConfig.signIn.topLogo"
              class="logo"
              :src="themeConfig.signIn.topLogo.src"
              :alt="themeConfig.signIn.topLogo.alt"
              :style="themeConfig.signIn.topLogo.style"
            />
            <h1
              v-if="themeConfig.signIn.showTitle"
              class="kolibri-title"
              :style="[{ color: $themeTokens.primary }, themeConfig.signIn.titleStyle]"
            >
              {{ logoText }}
            </h1>
            <p data-test="restrictedAccess">
              {{ $tr('restrictedAccess') }}
            </p>
            <p>{{ $tr('restrictedAccessDescription') }}</p>
          </div>
          <!-- remote access enabled -->
          <div
            v-else
            class="box"
            :style="{ backgroundColor: $themeTokens.surface }"
          >
            <CoreLogo
              v-if="themeConfig.signIn.topLogo"
              class="logo"
              :src="themeConfig.signIn.topLogo.src"
              :alt="themeConfig.signIn.topLogo.alt"
              :style="themeConfig.signIn.topLogo.style"
            />
            <h1
              v-if="themeConfig.signIn.showTitle"
              class="kolibri-title"
              :style="[{ color: $themeTokens.primary }, themeConfig.signIn.titleStyle]"
            >
              {{ logoText }}
            </h1>
            <p
              v-if="themeConfig.signIn.showPoweredBy"
              :style="themeConfig.signIn.poweredByStyle"
              class="small-text"
            >
              <KButton
                v-if="oidcProviderFlow"
                :text="$tr('poweredByKolibri')"
                appearance="basic-link"
                @click="whatsThisModalVisible = true"
              />
              <KExternalLink
                v-else
                :text="$tr('poweredByKolibri')"
                :primary="true"
                href="https://learningequality.org/r/powered_by_kolibri"
                :openInNewTab="true"
                appearance="basic-link"
              />
            </p>

            <slot></slot>

            <p
              v-if="!hideCreateAccount && canSignUp"
              class="create"
            >
              <KRouterLink
                :text="userString('createAccountAction')"
                :to="signUpPage"
                :primary="false"
                appearance="raised-button"
                :disabled="busy"
                style="width: 100%"
                data-test="createUser"
              />
            </p>

            <div>
              <component
                :is="component"
                v-for="component in loginOptions"
                :key="component.name"
              />
            </div>
            <p
              v-if="showGuestAccess"
              class="guest small-text"
            >
              <KExternalLink
                :text="$tr('accessAsGuest')"
                :href="guestURL"
                :primary="true"
                appearance="basic-link"
              />
            </p>
          </div>
          <div
            class="background"
            :style="backgroundImageStyle"
            aria-hidden="true"
          ></div>
        </div>
      </div>
      <div class="table-row">
        <div
          class="footer-cell table-cell"
          :style="{ backgroundColor: $themeTokens.surface }"
        >
          <LanguageSwitcherFooter />
          <div class="small-text">
            <span class="version-string">
              {{ versionMsg }}
            </span>
            <CoreLogo
              v-if="themeConfig.signIn.showKolibriFooterLogo"
              class="footer-logo"
            />
            <span v-else> • </span>
            <KButton
              :text="coreString('usageAndPrivacyLabel')"
              appearance="basic-link"
              @click="privacyModalVisible = true"
            />
            <template v-if="themeConfig.signIn.backgroundImgCredit">
              <span> • </span>
              <span>
                {{
                  $tr('photoCreditLabel', {
                    photoCredit: themeConfig.signIn.backgroundImgCredit,
                  })
                }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <PrivacyInfoModal
      v-if="privacyModalVisible"
      @submit="privacyModalVisible = false"
      @cancel="privacyModalVisible = false"
    />

    <KModal
      v-if="whatsThisModalVisible"
      :title="$tr('whatsThis')"
      :submitText="coreString('closeAction')"
      @submit="whatsThisModalVisible = false"
      @cancel="whatsThisModalVisible = false"
    >
      <p>{{ $tr('oidcGenericExplanation') }}</p>
      <p>
        <KExternalLink
          text="https://learningequality.org/kolibri"
          :primary="true"
          href="https://learningequality.org/r/powered_by_kolibri"
          :openInNewTab="true"
          appearance="basic-link"
        />
      </p>
    </KModal>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import themeConfig from 'kolibri.themeConfig';
  import loginComponents from 'kolibri.utils.loginComponents';
  import urls from 'kolibri.urls';
  import plugin_data from 'plugin_data';
  import { ComponentMap } from '../constants';
  import LanguageSwitcherFooter from '../views/LanguageSwitcherFooter';
  import commonUserStrings from './commonUserStrings';
  import getUrlParameter from './getUrlParameter';

  export default {
    name: 'AuthBase',
    components: { CoreLogo, LanguageSwitcherFooter, PrivacyInfoModal },
    mixins: [commonCoreStrings, commonUserStrings],
    setup() {
      const { isLearnerOnlyImport } = useUser();
      return { isLearnerOnlyImport, themeConfig };
    },
    props: {
      hideCreateAccount: {
        type: Boolean,
        required: false,
        default: false,
      },
      busy: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        privacyModalVisible: false,
        whatsThisModalVisible: false,
      };
    },
    computed: {
      ...mapGetters(['facilityConfig']),
      backgroundImageStyle() {
        if (this.themeConfig.signIn.background) {
          const scrimOpacity = this.themeConfig.signIn.scrimOpacity;
          return {
            backgroundColor: this.$themeTokens.primary,
            backgroundImage: `linear-gradient(rgba(0, 0, 0, ${scrimOpacity}), rgba(0, 0, 0, ${scrimOpacity})), url(${this.themeConfig.signIn.background})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            filter: 'blur(2px)',
          };
        }
        return { backgroundColor: this.$themeBrand.primary.v_800 };
      },
      guestURL() {
        return urls['kolibri:core:guest']();
      },
      canSignUp() {
        return (
          this.facilityConfig.is_full_facility_import && this.facilityConfig.learner_can_sign_up
        );
      },
      nextParam() {
        // query is after hash
        if (this.$route.query.next) {
          return this.$route.query.next;
        }
        // query is before hash
        return getUrlParameter('next');
      },
      signUpPage() {
        const signUpRoute = this.$router.getRoute(ComponentMap.SIGN_UP);
        if (this.nextParam) {
          return { ...signUpRoute, query: { next: this.nextParam } };
        }
        return signUpRoute;
      },
      loginOptions() {
        // POC, in the future sorting of different login options can be implemented
        return [...loginComponents];
      },
      logoText() {
        return this.themeConfig.signIn.title
          ? this.themeConfig.signIn.title
          : this.coreString('kolibriLabel');
      },
      oidcProviderFlow() {
        return plugin_data.oidcProviderEnabled && this.nextParam;
      },
      showGuestAccess() {
        return plugin_data.allowGuestAccess && !this.oidcProviderFlow;
      },
      versionMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
    },
    $trs: {
      accessAsGuest: {
        message: 'Explore without account',
        context:
          'Link on sign in page which upon clicking allows user to access Kolibri as a guest user.',
      },
      oidcGenericExplanation: {
        message:
          'Kolibri is an e-learning platform. You can also use your Kolibri account to log in to some third-party applications.',
        context: 'Generic explanation about Kolibri.',
      },
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      oidcSpecificExplanation: {
        message:
          "You were sent here from the application '{app_name}'. Kolibri is an e-learning platform, and you can also use your Kolibri account to access '{app_name}'.",
        context:
          'Explanation of Kolibri that a user sees if they are sent to Kolibri from a different application.',
      },
      poweredBy: {
        message: 'Kolibri {version}',
        context:
          'Indicates the current version of Kolibri.\n\nFor languages with non-latin scripts, Kolibri should be transcribed phonetically into the target language, similar to a person\'s name. It should not be translated as "hummingbird".',
      },
      poweredByKolibri: {
        message: 'Powered by Kolibri',
        context: 'Indicates that Kolibri is the technology behind this application.',
      },
      whatsThis: {
        message: "What's this?",
        context: 'Link with explanation of the authentication process.',
      },
      restrictedAccess: {
        message: 'Access to Kolibri has been restricted for external devices',
        context: 'Error message description.',
      },
      restrictedAccessDescription: {
        message:
          'To change this, sign in as a super admin and update the Device network access settings',

        context: 'Error message description',
      },
      photoCreditLabel: {
        message: 'Photo credit: {photoCredit}',
        context: 'Gives credit to the photographer of the background image.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

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
    position: relative;
    z-index: 1;
    display: table-row;
    // Do this to mitigate issues with just using z-index on Safari.
    transform: translateZ(1px);
  }

  .main-row {
    text-align: center;
  }

  .table-cell {
    display: table-cell;
  }

  .main-cell {
    height: 100%;
    vertical-align: middle;
  }

  .background {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
  }

  .box {
    @extend %dropshadow-16dp;

    position: relative;
    z-index: 1;
    width: 360px;
    padding: 32px;
    margin: 16px auto;
    border-radius: $radius;
  }

  .login-btn {
    width: calc(100% - 16px);
  }

  .create {
    margin-top: 24px;
    margin-bottom: 0;
  }

  .guest {
    margin-top: 24px;
    margin-bottom: 8px;
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
    margin-bottom: 0;
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

  /deep/ .ui-textbox-input {
    &:hover {
      outline: none;
    }
  }

</style>
