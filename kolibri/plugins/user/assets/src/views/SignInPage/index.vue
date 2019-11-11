<template>

  <div class="fh">

    <FacilityModal
      v-if="facilityModalVisible"
      @cancel="closeFacilityModal"
      @submit="closeFacilityModal"
    />

    <div class="wrapper-table">
      <div class="table-row main-row" :style="backgroundImageStyle">
        <div class="table-cell main-cell">
          <div class="box" :style="{ backgroundColor: $themePalette.grey.v_100 }">
            <CoreLogo
              v-if="$kolibriBranding.signIn.topLogo"
              class="logo"
              :src="$kolibriBranding.signIn.topLogo.src"
              :alt="$kolibriBranding.signIn.topLogo.alt"
              :style="$kolibriBranding.signIn.topLogo.style"
            />
            <h1
              v-if="$kolibriBranding.signIn.showTitle"
              class="kolibri-title"
              :class="$computedClass({color: $themeBrand.primary.v_300})"
              :style="$kolibriBranding.signIn.titleStyle"
            >
              {{ logoText }}
            </h1>
            <p
              v-if="$kolibriBranding.signIn.showPoweredBy"
              :style="$kolibriBranding.signIn.poweredByStyle"
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
                target="_blank"
                appearance="basic-link"
              />
            </p>
            <form ref="form" class="login-form" @submit.prevent="signIn">
              <UiAlert
                v-if="invalidCredentials"
                type="error"
                :dismissible="false"
              >
                {{ $tr('signInError') }}
              </UiAlert>
              <transition name="textbox">
                <KTextbox
                  id="username"
                  ref="username"
                  v-model="username"
                  autocomplete="username"
                  :autofocus="!hasMultipleFacilities"
                  :label="coreString('usernameLabel')"
                  :invalid="usernameIsInvalid"
                  :invalidText="usernameIsInvalidText"
                  @blur="handleUsernameBlur"
                  @input="showDropdown = true"
                  @keydown="handleKeyboardNav"
                />
              </transition>
              <transition name="list">
                <div class="suggestions-wrapper">
                  <ul
                    v-if="simpleSignIn && suggestions.length"
                    v-show="showDropdown"
                    class="suggestions"
                    :style="{backgroundColor: $themeTokens.surface}"
                  >
                    <UiAutocompleteSuggestion
                      v-for="(suggestion, i) in suggestions"
                      :key="i"
                      :suggestion="suggestion"
                      :style="suggestionStyle(i)"
                      @mousedown.native="fillUsername(suggestion)"
                    />
                  </ul>
                </div>
              </transition>
              <transition name="textbox">
                <KTextbox
                  v-if="needPasswordField"
                  id="password"
                  ref="password"
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  :label="coreString('passwordLabel')"
                  :autofocus="simpleSignIn"
                  :invalid="passwordIsInvalid"
                  :invalidText="passwordIsInvalidText"
                  :floatingLabel="!autoFilledByChromeAndNotEdited"
                  @blur="passwordBlurred = true"
                  @input="handlePasswordChanged"
                />
              </transition>
              <div>
                <KButton
                  class="login-btn"
                  type="submit"
                  :text="coreString('signInLabel')"
                  :primary="true"
                  :disabled="busy"
                />
              </div>
            </form>

            <p class="create">
              <KRouterLink
                v-if="canSignUp"
                :text="$tr('createAccountAction')"
                :to="signUpPage"
                :primary="true"
                appearance="flat-button"
              />
            </p>
            <div slot="options">
              <component :is="component" v-for="component in loginOptions" :key="component.name" />
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
        </div>
      </div>
      <div class="table-row">
        <div class="table-cell footer-cell" :style="{ backgroundColor: $themeTokens.surface }">
          <LanguageSwitcherFooter />
          <div class="small-text">
            <span class="version-string">
              {{ versionMsg }}
            </span>
            <CoreLogo
              v-if="this.$kolibriBranding.signIn.showKolibriFooterLogo"
              class="footer-logo"
            />
            <span v-else> • </span>
            <KButton
              :text="coreString('usageAndPrivacyLabel')"
              appearance="basic-link"
              @click="privacyModalVisible = true"
            />
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
          target="_blank"
          appearance="basic-link"
        />
      </p>
    </KModal>

  </div>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { FacilityUsernameResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { LoginErrors } from 'kolibri.coreVue.vuex.constants';
  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import { validateUsername } from 'kolibri.utils.validators';
  import UiAutocompleteSuggestion from 'keen-ui/src/UiAutocompleteSuggestion';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import branding from 'kolibri.utils.branding';
  import UiAlert from 'keen-ui/src/UiAlert';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import urls from 'kolibri.urls';
  import loginComponents from 'kolibri.utils.loginComponents';
  import { PageNames } from '../../constants';
  import LanguageSwitcherFooter from '../LanguageSwitcherFooter';
  import getUrlParameter from '../getUrlParameter';
  import FacilityModal from './FacilityModal';
  import plugin_data from 'plugin_data';

  export default {
    name: 'SignInPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      FacilityModal,
      CoreLogo,
      UiAutocompleteSuggestion,
      UiAlert,
      LanguageSwitcherFooter,
      PrivacyInfoModal,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    data() {
      return {
        username: '',
        password: '',
        usernameSuggestions: [],
        facilityModalVisible: this.$store.state.signIn.hasMultipleFacilities,
        suggestionTerm: '',
        showDropdown: true,
        highlightedIndex: -1,
        usernameBlurred: false,
        passwordBlurred: false,
        formSubmitted: false,
        autoFilledByChromeAndNotEdited: false,
        privacyModalVisible: false,
        whatsThisModalVisible: false,
      };
    },
    computed: {
      ...mapGetters(['facilityConfig']),
      // backend's default facility on load
      ...mapState(['facilityId']),
      ...mapState('signIn', ['hasMultipleFacilities']),
      ...mapState({
        passwordMissing: state => state.core.loginError === LoginErrors.PASSWORD_MISSING,
        invalidCredentials: state => state.core.loginError === LoginErrors.INVALID_CREDENTIALS,
        busy: state => state.core.signInBusy,
      }),
      simpleSignIn() {
        return this.facilityConfig.learner_can_login_with_no_password;
      },
      suggestions() {
        // Filter suggestions on the client side so we don't hammer the server
        return this.usernameSuggestions.filter(sug =>
          sug.toLowerCase().startsWith(this.username.toLowerCase())
        );
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.coreString('requiredFieldError');
          } else if (!validateUsername(this.username)) {
            return this.coreString('usernameNotAlphaNumError');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return Boolean(this.usernameIsInvalidText);
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.simpleSignIn && this.password === '') {
            return this.$tr('requiredForCoachesAdmins');
          } else if (this.password === '') {
            return this.coreString('requiredFieldError');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        // prevent validation from showing when we only think that the password is empty
        if (this.autoFilledByChromeAndNotEdited) {
          return false;
        }
        return Boolean(this.passwordIsInvalidText);
      },
      formIsValid() {
        if (this.simpleSignIn) {
          return !this.usernameIsInvalid;
        }
        return !this.usernameIsInvalid && !this.passwordIsInvalid;
      },
      canSignUp() {
        return this.facilityConfig.learner_can_sign_up;
      },
      signUpPage() {
        if (this.nextParam) {
          return { name: PageNames.SIGN_UP, query: { next: this.nextParam } };
        }
        return { name: PageNames.SIGN_UP };
      },
      versionMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      hasServerError() {
        return Boolean(this.passwordMissing || this.invalidCredentials);
      },
      needPasswordField() {
        return !this.simpleSignIn || this.hasServerError;
      },
      showGuestAccess() {
        return this.facilityConfig.allow_guest_access && !this.oidcProviderFlow;
      },
      logoText() {
        return this.$kolibriBranding.signIn.title
          ? this.$kolibriBranding.signIn.title
          : this.coreString('kolibriLabel');
      },
      guestURL() {
        return urls['kolibri:core:guest']();
      },
      backgroundImageStyle() {
        if (this.$kolibriBranding.signIn.background) {
          const scrimOpacity =
            this.$kolibriBranding.signIn.scrimOpacity !== undefined
              ? this.$kolibriBranding.signIn.scrimOpacity
              : 0.7;
          return {
            backgroundColor: this.$themeTokens.primary,
            backgroundImage: `linear-gradient(rgba(0, 0, 0, ${scrimOpacity}), rgba(0, 0, 0, ${scrimOpacity})), url(${this.$kolibriBranding.signIn.background})`,
          };
        }
        return { backgroundColor: this.$themeBrand.primary.v_900 };
      },
      oidcProviderFlow() {
        return plugin_data.oidcProviderEnabled && this.nextParam;
      },
      nextParam() {
        // query is after hash
        if (this.$route.query.next) {
          return this.$route.query.next;
        }
        // query is before hash
        return getUrlParameter('next');
      },
      loginOptions() {
        // POC, in the future sorting of different login options can be implemented
        return [...loginComponents];
      },
    },
    watch: {
      username(newVal) {
        this.setSuggestionTerm(newVal);
      },
    },
    created() {
      this.$kolibriBranding = branding;
    },
    mounted() {
      /*
        Chrome has non-standard behavior with auto-filled text fields where
        the value shows up as an empty string even though there is text in
        the field:
          https://bugs.chromium.org/p/chromium/issues/detail?id=669724
        As super-brittle hack to detect the presence of auto-filled text and
        work-around it, we look for a change in background color as described
        here:
          https://stackoverflow.com/a/35783761
      */
      setTimeout(() => {
        const bgColor = window.getComputedStyle(this.$refs.username.$el.querySelector('input'))
          .backgroundColor;

        if (bgColor === 'rgb(250, 255, 189)') {
          this.autoFilledByChromeAndNotEdited = true;
        }
      }, 250);
    },
    methods: {
      ...mapActions(['kolibriLogin']),
      closeFacilityModal() {
        this.facilityModalVisible = false;
        this.$nextTick().then(() => {
          this.$refs.username.focus();
        });
      },
      setSuggestionTerm(newVal) {
        if (newVal !== null && typeof newVal !== 'undefined') {
          // Only check if defined or not null
          if (newVal.length < 3) {
            // Don't search for suggestions if less than 3 characters entered
            this.suggestionTerm = '';
            this.usernameSuggestions = [];
          } else if (
            (!newVal.startsWith(this.suggestionTerm) && this.suggestionTerm.length) ||
            !this.suggestionTerm.length
          ) {
            // We have already set a suggestion search term
            // The currently set suggestion term does not match the current username
            // Or we do not currently have a suggestion term set
            // Set it to the new term and fetch new suggestions
            this.suggestionTerm = newVal;
            this.setSuggestions();
          }
        }
      },
      setSuggestions() {
        FacilityUsernameResource.fetchCollection({
          getParams: {
            facility: this.facility,
            search: this.suggestionTerm,
          },
        })
          .then(users => {
            this.usernameSuggestions = users.map(user => user.username);
            this.showDropdown = true;
          })
          .catch(() => {
            this.usernameSuggestions = [];
          });
      },
      handleKeyboardNav(e) {
        switch (e.code) {
          case 'ArrowDown':
            if (this.showDropdown && this.suggestions.length) {
              this.highlightedIndex = Math.min(
                this.highlightedIndex + 1,
                this.suggestions.length - 1
              );
            }
            break;
          case 'ArrowUp':
            if (this.showDropdown && this.suggestions.length) {
              this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
            }
            break;
          case 'Escape':
            this.showDropdown = false;
            break;
          case 'Enter':
            if (this.highlightedIndex < 0) {
              this.showDropdown = false;
            } else {
              this.fillUsername(this.suggestions[this.highlightedIndex]);
              e.preventDefault();
            }
            break;
          default:
            this.showDropdown = true;
        }
      },
      fillUsername(username) {
        // Only do this if we have been passed a non-null value
        if (username !== null && typeof username !== 'undefined') {
          this.username = username;
          this.showDropdown = false;
          this.highlightedIndex = -1;
          // focus on input after selection
          this.$refs.username.focus();
        }
      },
      handleUsernameBlur() {
        this.usernameBlurred = true;
        this.showDropdown = false;
      },
      signIn() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          const sessionPayload = {
            username: this.username,
            password: this.password,
            facility: this.facilityId,
          };
          if (plugin_data.oidcProviderEnabled) {
            sessionPayload['next'] = this.nextParam;
          } else if (this.$route.query.redirect && !this.nextParam) {
            // Go to URL in 'redirect' query param, if arriving from AuthMessage
            sessionPayload['next'] = this.$route.query.redirect;
          }
          this.kolibriLogin(sessionPayload).catch();
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        if (this.usernameIsInvalid) {
          this.$refs.username.focus();
        } else if (this.passwordIsInvalid) {
          this.$refs.password.focus();
        }
      },
      handlePasswordChanged() {
        this.autoFilledByChromeAndNotEdited = false;
      },
      suggestionStyle(i) {
        return {
          backgroundColor: this.highlightedIndex === i ? this.$themePalette.grey.v_200 : '',
        };
      },
    },
    $trs: {
      createAccountAction: 'Create an account',
      poweredByKolibri: 'Powered by Kolibri',
      whatsThis: "What's this?",
      oidcGenericExplanation:
        'Kolibri is an e-learning platform. You can also use your Kolibri account to log in to some third-party applications.',
      // Disable the rule here because we will keep this unused string in case we need it later on
      // eslint-disable-next-line kolibri/vue-no-unused-translations
      oidcSpecificExplanation:
        "You were sent here from the application '{app_name}'. Kolibri is an e-learning platform, and you can also use your Kolibri account to access '{app_name}'.",
      accessAsGuest: 'Explore without account',
      signInError: 'Incorrect username or password',
      poweredBy: 'Kolibri {version}',
      requiredForCoachesAdmins: 'Password is required for coaches and admins',
      documentTitle: 'User Sign In',
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

  .login-form {
    text-align: left;
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
