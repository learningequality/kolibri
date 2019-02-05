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
        return [this.$computedClass(this.linkStyle), linkClass];
      } else if (this.primary && this.appearance === RAISED_BUTTON) {
        return [buttonClass, this.$computedClass(this.primaryRaisedStyle), raisedClass];
      } else if (this.primary && this.appearance === FLAT_BUTTON) {
        return [buttonClass, this.$computedClass(this.primaryFlatStyle)];
      } else if (!this.primary && this.appearance === RAISED_BUTTON) {
        return [buttonClass, this.$computedClass(this.secondaryRaisedStyle), raisedClass];
      } else if (!this.primary && this.appearance === FLAT_BUTTON) {
        return [buttonClass, this.$computedClass(this.secondaryFlatStyle)];
      }
    },
    linkStyle() {
      return {
        color: this.$coreActionNormal,
        ':hover': {
          color: this.$coreActionDark,
        },
        ':focus': this.$coreOutline,
        ':disabled': {
          color: `rgba(${this.$coreActionNormal}, 0.5)`,
        },
      };
    },
    primaryRaisedStyle() {
      return {
        color: $primaryRaisedColor,
        backgroundColor: this.$coreActionNormal,
        ':hover': {
          backgroundColor: this.$coreActionDark,
        },
        ':focus': { ...this.$coreOutline, outlineOffset: '6px' },
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
      return {
        color: this.$coreActionNormal,
        ':hover': {
          backgroundColor: this.$coreGrey300,
        },
        ':focus': { ...this.$coreOutline, outlineOffset: 0 },
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
      return {
        color: this.$coreTextDefault,
        backgroundColor: this.$coreGrey200,
        ':hover': {
          backgroundColor: this.$coreGrey300,
        },
        ':focus': { ...this.$coreOutline, outlineOffset: '6px' },
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
      return {
        color: this.$coreTextDefault,
        ':hover': {
          backgroundColor: this.$coreGrey300,
        },
        ':focus': { ...this.$coreOutline, outlineOffset: 0 },
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
