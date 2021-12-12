import logger from 'kolibri.lib.logging';
import { objectValidator } from 'kolibri.utils.validators';

const logging = logger.getLogger(__filename);

function _colorScaleValidator(value) {
  if (typeof yourVariable !== 'object') return false;
  const COLOR_NAMES = [
    'v_50',
    'v_100',
    'v_200',
    'v_300',
    'v_400',
    'v_500',
    'v_600',
    'v_700',
    'v_800',
    'v_900',
  ];
  for (const colorName of COLOR_NAMES) {
    if (!value[colorName]) {
      logging.error(`${color} '${name}' not defined by theme`);
      return false;
    }
    return true;
  }
}

const _imageValidator = objectValidator({
  src: {
    type: String,
    required: true,
  },
  style: {
    type: String,
    default: null,
  },
  alt: {
    type: String,
    default: null,
  },
});

const validateTheme = objectValidator({
  brandColors: {
    type: Object,
    default: null,
    validator: objectValidator({
      primary: {
        type: Object,
        required: true,
        validator: _colorScaleValidator,
      },
      secondary: {
        type: Object,
        required: true,
        validator: _colorScaleValidator,
      },
    }),
  },
  tokenMapping: {
    type: Object,
    default: null,
  },
  signIn: {
    type: Object,
    default: null,
    validator: objectValidator({
      background: {
        type: String,
        default: null,
      },
      backgroundImgCredit: {
        type: String,
        default: null,
      },
      scrimOpacity: {
        type: Number,
        default: 0.7,
        validator(opacity) {
          if (opacity < 0 || opacity > 1) {
            logging.error(`Scrim opacity '${opacity}' is not in range [0,1]`);
            return false;
          }
          return true;
        },
      },
      topLogo: {
        type: Object,
        default: null,
        validator: _imageValidator,
      },
      poweredByStyle: {
        type: String,
        default: null,
      },
      title: {
        type: String,
        default: null,
      },
      showTitle: {
        type: Boolean,
        default: true,
      },
      showKolibriFooterLogo: {
        type: Boolean,
        default: true,
      },
      showPoweredBy: {
        type: Boolean,
        default: true,
      },
    }),
  },
  sideNav: {
    type: Object,
    default: null,
    validator: objectValidator({
      title: {
        type: String,
        default: null,
      },
      topLogo: {
        type: Object,
        default: null,
        validator: _imageValidator,
      },
      showKolibriFooterLogo: {
        type: Boolean,
        default: true,
      },
      showPoweredBy: {
        type: Boolean,
        default: true,
      },
      brandedFooter: {
        type: Object,
        default: null,
        validator: objectValidator({
          logo: {
            type: Object,
            default: null,
            validator: _imageValidator,
          },
          paragraphArray: {
            type: Array,
            default: [],
          },
        }),
      },
    }),
  },
});

export default validateTheme;
