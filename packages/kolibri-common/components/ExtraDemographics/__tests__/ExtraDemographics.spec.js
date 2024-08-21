import { mount } from '@vue/test-utils';
import ExtraDemographics from '../index.vue';
import ExtraDemographicField from '../ExtraDemographicField.vue';

const field1 = {
  id: 'age',
  description: 'Age',
  enumValues: [
    {
      value: '0-5',
      defaultLabel: 'Zero to Five',
    },
    {
      value: '6-10',
      defaultLabel: 'Six to Ten',
    },
    {
      value: '11-15',
      defaultLabel: 'Eleven to Fifteen',
    },
    {
      value: '16-20',
      defaultLabel: 'Sixteen to Twenty',
    },
    {
      value: '21-25',
      defaultLabel: 'Twenty-One to Twenty-Five',
    },
  ],
};

const field2 = {
  id: 'flavour',
  description: 'Flavour',
  enumValues: [
    {
      value: 'up',
      defaultLabel: 'Up',
    },
    {
      value: 'down',
      defaultLabel: 'Down',
    },
    {
      value: 'strange',
      defaultLabel: 'Strange',
    },
    {
      value: 'charm',
      defaultLabel: 'Charm',
    },
    {
      value: 'top',
      defaultLabel: 'Top',
    },
    {
      value: 'bottom',
      defaultLabel: 'Bottom',
    },
  ],
};

const mockFacilityDatasetExtraFields = {
  demographic_fields: [field1, field2],
};

describe('ExtraDemographics', () => {
  it('renders ExtraDemographicField for each field in customSchema', () => {
    const wrapper = mount(ExtraDemographics, {
      propsData: {
        facilityDatasetExtraFields: mockFacilityDatasetExtraFields,
        value: null,
      },
    });
    const extraDemographicFields = wrapper.findAllComponents(ExtraDemographicField);
    expect(extraDemographicFields).toHaveLength(
      mockFacilityDatasetExtraFields.demographic_fields.length,
    );
  });

  it('emits input event with updated value when ExtraDemographicField emits select', () => {
    const wrapper = mount(ExtraDemographics, {
      propsData: {
        facilityDatasetExtraFields: mockFacilityDatasetExtraFields,
        value: null,
      },
    });
    const extraDemographicField = wrapper.findComponent(ExtraDemographicField);
    extraDemographicField.vm.$emit('select', '6-10');
    expect(wrapper.emitted().input[0]).toEqual([{ age: '6-10' }]);
  });

  it('computes customSchema correctly', () => {
    const wrapper = mount(ExtraDemographics, {
      propsData: {
        facilityDatasetExtraFields: mockFacilityDatasetExtraFields,
        value: null,
      },
    });
    expect(wrapper.vm.customSchema).toEqual(mockFacilityDatasetExtraFields.demographic_fields);
  });
});
