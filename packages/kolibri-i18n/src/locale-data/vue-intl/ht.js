!(function (e, a) {
  'object' == typeof exports && 'undefined' != typeof module
    ? (module.exports = a())
    : 'function' == typeof define && define.amd // eslint-disable-line no-undef
      ? define(a) // eslint-disable-line no-undef
      : ((e.ReactIntlLocaleData = e.ReactIntlLocaleData || {}), (e.ReactIntlLocaleData.en = a()));
})(this, function () {
  'use strict';
  return [
    {
      locale: 'ht',
      pluralRuleFunction: function (e, a) {
        return a ? (1 == e ? 'one' : 'other') : 0 <= e && e < 2 ? 'one' : 'other';
      },
      fields: {
        year: {
          displayName: 'ane',
          relative: {
            0: 'ane sa a',
            1: 'ane pwochèn',
            '-1': 'ane pase',
          },
          relativeTime: {
            future: {
              one: 'nan {0} ane',
              other: 'nan {0} ane',
            },
            past: {
              one: '{0} ane pase',
              other: '{0} ane pase',
            },
          },
        },
        'year-short': {
          displayName: 'ane.',
          relative: {
            0: 'ane sa a.',
            1: 'ane pwochèn.',
            '-1': 'ane pase.',
          },
          relativeTime: {
            future: {
              one: 'nan {0} ane.',
              other: 'nan {0} ane pase.',
            },
            past: {
              one: '{0} ane ki pase',
              other: '{0} ane pase',
            },
          },
        },
        month: {
          displayName: 'mwa',
          relative: {
            0: 'mwa sa a',
            1: 'mwa pwochèn',
            '-1': 'mwa pase',
          },
          relativeTime: {
            future: {
              one: 'nan {0} mwa',
              other: 'nan {0} mwa',
            },
            past: {
              one: '{0} mwa pase',
              other: '{0} mwa pase',
            },
          },
        },
        'month-short': {
          displayName: 'mwa.',
          relative: {
            0: 'mwa sa a.',
            1: 'mwa pwochèn.',
            '-1': 'mwa pase.',
          },
          relativeTime: {
            future: {
              one: 'nan {0} mwa.',
              other: 'nan {0} mwa.',
            },
            past: {
              one: '{0} mwa pase',
              other: '{0} mwa pase',
            },
          },
        },
        day: {
          displayName: 'jou',
          relative: {
            0: 'jodi a',
            1: 'demen',
            '-1': 'yè',
          },
          relativeTime: {
            future: {
              one: 'nan {0} jou',
              other: 'nan {0} jou',
            },
            past: {
              one: '{0} jou pase',
              other: '{0} jou pase',
            },
          },
        },
        'day-short': {
          displayName: 'jou',
          relative: {
            0: 'jodi a',
            1: 'demen',
            '-1': 'yè',
          },
          relativeTime: {
            future: {
              one: 'nan {0} jou',
              other: 'nan {0} jou',
            },
            past: {
              one: '{0} jou pase',
              other: '{0} jou pase',
            },
          },
        },
        hour: {
          displayName: 'lè',
          relative: {
            0: 'nan lè sa a',
          },
          relativeTime: {
            future: {
              one: 'nan {0} èdtan',
              other: 'nan {0} èdtan',
            },
            past: {
              one: '{0} èdtan pase',
              other: '{0} èdtan pase',
            },
          },
        },
        'hour-short': {
          displayName: 'lè/èdtan',
          relative: {
            0: 'nan lè sa a',
          },
          relativeTime: {
            future: {
              one: 'nan {0} èdtan',
              other: 'nan {0} èdtan',
            },
            past: {
              one: '{0} èdtan pase',
              other: '{0} èdtan pase',
            },
          },
        },
        minute: {
          displayName: 'minit',
          relative: {
            0: 'minit sa a',
          },
          relativeTime: {
            future: {
              one: 'nan {0} minit',
              other: 'nan {0} minit',
            },
            past: {
              one: '{0} minit pase',
              other: '{0} minit pase',
            },
          },
        },
        'minute-short': {
          displayName: 'minit.',
          relative: {
            0: 'minit sa a',
          },
          relativeTime: {
            future: {
              one: 'nan {0} minit.',
              other: 'nan {0} minit.',
            },
            past: {
              one: '{0} minit pase',
              other: '{0} minit pase',
            },
          },
        },
        second: {
          displayName: 'segonn',
          relative: {
            0: 'kounye a',
          },
          relativeTime: {
            future: {
              one: 'nan {0} segonn',
              other: 'nan {0} segonn',
            },
            past: {
              one: '{0} segonn pase',
              other: '{0} segonn pase',
            },
          },
        },
        'second-short': {
          displayName: 'segonn.',
          relative: {
            0: 'kounye a',
          },
          relativeTime: {
            future: {
              one: 'nan {0} segonn.',
              other: 'nan {0} segonn.',
            },
            past: {
              one: '{0} segonn pase',
              other: '{0} segonn pase',
            },
          },
        },
      },
    },
  ];
});
