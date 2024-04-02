import { mount } from '@vue/test-utils';
import ExtraDemographicField from '../ExtraDemographicField.vue';

const label = 'Age';

const field = {
  id: 'age',
  description: label,
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

describe('ExtraDemographicField', () => {
  it('renders the label correctly', () => {
    const wrapper = mount(ExtraDemographicField, {
      propsData: {
        field,
        value: '0-5',
      },
    });
    expect(wrapper.vm.description).toBe(label);
  });

  it('renders the translated label correctly', () => {
    const wrapper = mount(ExtraDemographicField, {
      propsData: {
        field: {
          ...field,
          translations: {
            en: 'Not Age',
          },
        },
        value: '0-5',
      },
    });
    expect(wrapper.vm.description).toBe('Not Age');
  });

  it('generates the correct options', () => {
    const wrapper = mount(ExtraDemographicField, {
      propsData: {
        field,
        value: '0-5',
      },
    });

    const options = wrapper.vm.options;
    expect(options.length).toBe(5);
    expect(options[0].value).toBe('0-5');
    expect(options[0].label).toBe('Zero to Five');
    expect(options[1].value).toBe('6-10');
    expect(options[1].label).toBe('Six to Ten');
    expect(options[2].value).toBe('11-15');
    expect(options[2].label).toBe('Eleven to Fifteen');
    expect(options[3].value).toBe('16-20');
    expect(options[3].label).toBe('Sixteen to Twenty');
    expect(options[4].value).toBe('21-25');
    expect(options[4].label).toBe('Twenty-One to Twenty-Five');
  });

  it('generates the correct translated options', () => {
    const enumValues = [
      {
        value: '0-5',
        defaultLabel: 'Zero to Five',
        translations: {
          en: 'Less than Five',
        },
      },
      {
        value: '6-10',
        defaultLabel: 'Six to Ten',
        translations: {
          en: 'More than Six but less than Ten',
        },
      },
      {
        value: '11-15',
        defaultLabel: 'Eleven to Fifteen',
        translations: {
          en: 'More than Eleven but less than Fifteen',
        },
      },
      {
        value: '16-20',
        defaultLabel: 'Sixteen to Twenty',
        translations: {
          en: 'More than Sixteen but less than Twenty',
        },
      },
      {
        value: '21-25',
        defaultLabel: 'Twenty-One to Twenty-Five',
        translations: {
          en: 'More than Twenty-One but less than Twenty-Five',
        },
      },
    ];
    const wrapper = mount(ExtraDemographicField, {
      propsData: {
        field: {
          ...field,
          enumValues,
        },
        value: '0-5',
      },
    });

    const options = wrapper.vm.options;
    expect(options.length).toBe(5);
    expect(options[0].value).toBe('0-5');
    expect(options[0].label).toBe('Less than Five');
    expect(options[1].value).toBe('6-10');
    expect(options[1].label).toBe('More than Six but less than Ten');
    expect(options[2].value).toBe('11-15');
    expect(options[2].label).toBe('More than Eleven but less than Fifteen');
    expect(options[3].value).toBe('16-20');
    expect(options[3].label).toBe('More than Sixteen but less than Twenty');
    expect(options[4].value).toBe('21-25');
    expect(options[4].label).toBe('More than Twenty-One but less than Twenty-Five');
  });

  it('emits the select event when the value changes', () => {
    const wrapper = mount(ExtraDemographicField, {
      propsData: {
        field,
        value: '0-5',
      },
    });

    const input = wrapper.findComponent({ name: 'KSelect' });
    input.vm.$emit('select', { value: '6-10' });

    expect(wrapper.emitted().select).toBeTruthy();
    expect(wrapper.emitted().select[0]).toEqual(['6-10']);
  });
});
