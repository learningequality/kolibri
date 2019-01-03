import { mapGetters } from 'vuex';
import { FLAT_BUTTON, RAISED_BUTTON, BASIC_LINK, validator } from './appearances.js';

const $primaryRaisedColor = 'white';
const $primaryRaisedDisabledColor = 'rgba(white, 0.45)';

const disabledStyle = {
  pointerEvents: 'none',
  cursor: 'default',
  boxShadow: 'none',
};

export default {
  props: {
    /**
     * Button label text
     */
    text: {
      type: String,
      required: false,
    },
    /**
     * Button appearance: 'raised-button', 'flat-button', or 'basic-link'
     */
    appearance: {
      type: String,
      default: 'basic-link',
      validator,
    },
    /**
     * For 'raised-button' and 'flat-button' appearances: show as primary or secondary style
     */
    primary: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapGetters([
      '$coreGrey200',
      '$coreGrey300',
      '$coreOutline',
      '$coreActionDark',
      '$coreActionNormal',
      '$coreTextDefault',
    ]),
    buttonClasses() {
      const buttonClass = 'button';
      const linkClass = 'link';
      const raisedClass = 'raised';
      if (this.appearance === BASIC_LINK) {
        return [linkClass, this.primary ? 'primary' : 'secondary'];
      } else if (this.primary && this.appearance === RAISED_BUTTON) {
        return [buttonClass, raisedClass, this.primary ? 'primary' : 'secondary'];
      } else if (this.primary && this.appearance === FLAT_BUTTON) {
        return [buttonClass, this.primary ? 'primary' : 'secondary', 'flat'];
      } else if (!this.primary && this.appearance === RAISED_BUTTON) {
        return [buttonClass, raisedClass, this.primary ? 'primary' : 'secondary'];
      } else if (!this.primary && this.appearance === FLAT_BUTTON) {
        return [buttonClass, this.primary ? 'primary' : 'secondary', 'flat'];
      }
    },

    linkStyle() {
      return {
        color: this.$coreActionNormal,

        ':hover': {
          color: this.$coreActionDark,
        },

        ':hover:focus': {
          outline: this.$coreOutline,
        },
        ':disabled': {
          color: `rgba(${this.$coreActionNormal}, 0.5)`,
        },
      };
    },

    primaryRaisedStyle() {
      const hoverAndFocus = {
        backgroundColor: this.$coreActionDark,
      };
      return {
        color: $primaryRaisedColor,
        backgroundColor: this.$coreActionNormal,
        ':hover': hoverAndFocus,
        ':focus': hoverAndFocus,
        ':disabled': Object.assign(
          {
            color: $primaryRaisedDisabledColor,
            backgroundColor: `rgba(${this.$coreActionNormal}, 0.75)`,
            svg: {
              fill: $primaryRaisedDisabledColor,
            },
          },
          disabledStyle
        ),
        svg: {
          fill: $primaryRaisedColor,
        },
      };
    },

    primaryFlatStyle() {
      const hoverAndFocus = {
        backgroundColor: this.$coreGrey300,
      };
      return {
        color: this.$coreActionNormal,
        ':hover': hoverAndFocus,
        ':focus': hoverAndFocus,
        ':disabled': Object.assign(
          {
            color: `rgba(${this.$coreActionNormal}, 0.5)`,
            svg: {
              fill: `rgba(${this.$coreActionNormal}, 0.5)`,
            },
          },
          disabledStyle
        ),
        svg: {
          fill: this.$coreActionNormal,
        },
      };
    },

    secondaryRaisedStyle() {
      const hoverAndFocus = {
        backgroundColor: this.$coreGrey300,
      };
      return {
        color: this.$coreTextDefault,
        backgroundColor: this.$coreGrey200,
        ':hover': hoverAndFocus,
        ':focus': hoverAndFocus,
        ':disabled': Object.assign(
          {
            color: `rgba(${this.$coreTextDefault}, 0.25)`,
            backgroundColor: `rgba(${this.$coreTextDefault}, 0.1)`,
            svg: {
              fill: `rgba(${this.$coreTextDefault}, 0.25)`,
            },
          },
          disabledStyle
        ),
        svg: {
          fill: this.$coreTextDefault,
        },
      };
    },

    secondaryFlatStyle() {
      const hoverAndFocus = {
        backgroundColor: this.$coreGrey300,
      };
      return {
        color: this.$coreTextDefault,
        ':hover': hoverAndFocus,
        ':focus': hoverAndFocus,
        ':disabled': Object.assign(
          {
            color: `rgba(${this.$coreTextDefault}, 0.25)`,
            svg: {
              fill: this.$coreTextDefault,
            },
          },
          disabledStyle
        ),
        svg: {
          fill: this.$coreTextDefault,
        },
      };
    },
  },
};
