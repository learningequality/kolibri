import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
import merge from 'lodash/merge';
import { FLAT_BUTTON, RAISED_BUTTON, BASIC_LINK, validator } from './appearances.js';

const $primaryRaisedColor = 'white';
const $primaryRaisedDisabledColor = 'rgba(white, 0.45)';

const disabledStyle = {
  pointerEvents: 'none',
  cursor: 'default',
  boxShadow: 'none',
  opacity: 0.5,
};

export default {
  mixins: [themeMixin],
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
     * Overrides that will modify the styles sent to `$computedClass` based on `appearance` prop
     */
    appearanceOverrides: {
      type: Object,
      default: () => ({}),
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
    buttonClasses() {
      const buttonClass = 'button';
      const linkClass = 'link';
      const raisedClass = 'raised';
      if (this.appearance === BASIC_LINK) {
        return [this.buttonComputedClass(this.linkStyle), linkClass];
      } else if (this.primary && this.appearance === RAISED_BUTTON) {
        return [buttonClass, this.buttonComputedClass(this.primaryRaisedStyle), raisedClass];
      } else if (this.primary && this.appearance === FLAT_BUTTON) {
        return [buttonClass, this.buttonComputedClass(this.primaryFlatStyle)];
      } else if (!this.primary && this.appearance === RAISED_BUTTON) {
        return [buttonClass, this.buttonComputedClass(this.secondaryRaisedStyle), raisedClass];
      } else if (!this.primary && this.appearance === FLAT_BUTTON) {
        return [buttonClass, this.buttonComputedClass(this.secondaryFlatStyle)];
      }
    },
    linkStyle() {
      return {
        color: this.$coreActionNormal,
        ':hover': { color: this.$coreActionDark },
        ':focus': this.$coreOutline,
        ':disabled': { opacity: 0.5 },
      };
    },
    primaryRaisedStyle() {
      return {
        color: $primaryRaisedColor,
        backgroundColor: this.$coreActionNormal,
        ':hover': { backgroundColor: this.$coreActionDark },
        ':focus': { ...this.$coreOutline, outlineOffset: '6px' },
        ':disabled': Object.assign(
          {
            color: $primaryRaisedDisabledColor,
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
        ':disabled': disabledStyle,
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
        ':disabled': disabledStyle,
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
        ':disabled': disabledStyle,
        svg: {
          fill: this.$coreTextDefault,
        },
      };
    },
  },
  methods: {
    buttonComputedClass(styles) {
      return this.$computedClass(merge({}, styles, this.appearanceOverrides));
    },
  },
};
