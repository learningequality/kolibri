import logger from 'kolibri.lib.logging';
import isObject from 'lodash/isObject';

const logging = logger.getLogger(__filename);

function _colorScaleValidator(value) {
  if (!isObject(value)) {
    logging.error(`Expected object but got '${value}'`);
    return false;
  }
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
      logging.error(`${colorName} '${name}' not defined by theme`);
      return false;
    }
  }
  return true;
}

const _imageSpec = {
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
};

export default {
  brandColors: {
    type: Object,
    default: null,
    spec: {
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
    },
  },
  tokenMapping: {
    type: Object,
    default: null,
  },
  signIn: {
    type: Object,
    default: null,
    spec: {
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
        spec: _imageSpec,
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
    },
  },
  sideNav: {
    type: Object,
    default: null,
    spec: {
      title: {
        type: String,
        default: null,
      },
      topLogo: {
        type: Object,
        default: null,
        spec: _imageSpec,
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
        spec: {
          logo: {
            type: Object,
            default: null,
            spec: _imageSpec,
          },
          paragraphArray: {
            type: Array,
            default: [],
          },
        },
      },
    },
  },
};
