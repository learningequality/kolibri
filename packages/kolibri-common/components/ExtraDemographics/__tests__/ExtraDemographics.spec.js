import { render } from '@testing-library/vue';
import { selectKSelectOption } from 'testUtils'; // eslint-disable-line
import ExtraDemographics from '../index.vue';

const SIX_TO_TEN = { value: '6-10', defaultLabel: 'Six to Ten' };
const CHARM = { value: 'charm', defaultLabel: 'Charm' };

const ageField = {
  id: 'age',
  description: 'Age',
  enumValues: [{ value: '0-5', defaultLabel: 'Zero to Five' }, SIX_TO_TEN],
};

const flavourField = {
  id: 'flavour',
  description: 'Flavour',
  enumValues: [{ value: 'strange', defaultLabel: 'Strange' }, CHARM],
};

const renderComponent = props => {
  return render(ExtraDemographics, {
    props: {
      facilityDatasetExtraFields: { demographic_fields: [ageField, flavourField] },
      ...props,
    },
  });
};

describe('ExtraDemographics', () => {
  it('emits the picked answer when no answers are saved yet', async () => {
    const { emitted } = renderComponent({ value: null });

    await selectKSelectOption(ageField.description, SIX_TO_TEN.defaultLabel);
    expect(emitted().input).toEqual([[{ [ageField.id]: SIX_TO_TEN.value }]]);
  });

  it('keeps the saved answers when another field is answered', async () => {
    const { emitted } = renderComponent({ value: { [ageField.id]: SIX_TO_TEN.value } });

    await selectKSelectOption(flavourField.description, CHARM.defaultLabel);
    expect(emitted().input).toEqual([
      [{ [ageField.id]: SIX_TO_TEN.value, [flavourField.id]: CHARM.value }],
    ]);
  });
});
