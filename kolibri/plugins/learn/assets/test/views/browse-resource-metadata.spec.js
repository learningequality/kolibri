import { shallowMount } from '@vue/test-utils';
import BrowseResourceMetadata from '../../src/views/BrowseResourceMetadata';
import LearningActivityChip from '../../src/views/LearningActivityChip';

/* eslint-disable */
const longDescription =
  'Isha and Birendra welcome you to Nepal! What is the population of Nepal? TRANSCRIPT: Namaste and welcome to Nepal. My name is Isatap and I study in Grade 7. Nepal lies between the two biggest countries of the world, India and China. The population of Nepal is 27 million approximately. The capital city of Nepal is Kathmandu. Once again, welcome to Nepal. Group: Welcome to Nepal! Good morning! My name is Birendra.I am 13 years old. My country’s name is Nepal. Nepal is situated in between the two large countries China and India. Kathmandu is Capital city of Nepal. It has a 27 million person population. Lastly, our greetings and best wishes to all of you from Nepal. Bye!! Group: Welcome to Nepal! MORE INFO: The red paint on the forehead is known as tikka and is worn for cultural purposes. The kids had it on today as it was ‘Teachers Day’ and the kids had a ceremony honoring their teachers.';
/* eslint-enable */

/*
 * Give a value which will be passed as props data.
 */
const metadataKeys = {
  'activityKind is truthy and LearningActivityChip is shown': {
    key: 'activityKind',
    value: 'watch',
    expectation: wrapper => expect(wrapper.findComponent(LearningActivityChip)).toBeTruthy(),
  },
  "'for beginners' chip when forBeginners is true": {
    value: true,
    expectation: wrapper => expect(wrapper.find('[data-test="beginners-chip"]')).toBeTruthy(),
  },
  'content has a title': {
    value: 'title',
    expectation: wrapper => expect(wrapper.find('[data-test="content-title"]')).toBeTruthy(),
  },
  'content has a short description': {
    value: 'description',
    expectation: wrapper => expect(wrapper.find('[data-test="content-description"]')).toBeTruthy(),
  },
  'content has a long description': {
    value: longDescription,
    expectation: wrapper => expect(wrapper.find('[data-test="show--or-less"]')).toBeTruthy(),
  },
};
/*
  'forBeginners',
  'title',
  'description',
  'level',
  'duration',
  'lang',
  'accessibility',
  'whatYouWillNeed',
  'author',
  'license_owner',
  'related',
  'locations',
];
*/

function makeWrapper({ propsData } = {}) {
  return shallowMount(BrowseResourceMetadata, {
    propsData,
  });
}

describe("displays the metadata when given, and doesn't when not", () => {
  it.each(Object.keys(metadataKeys))('displays %s when available, nothing if not', key => {
    const metadata = metadataKeys[key];
    const wrapper = makeWrapper({
      propsData: {
        content: {
          [key]: metadata.value,
        },
      },
    });
    metadata.expectation(wrapper);
  });
});
