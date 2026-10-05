import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { currentLanguage } from 'kolibri/utils/i18n';
import { selectKSelectOption } from 'testUtils'; // eslint-disable-line
import ExtraDemographicField from '../ExtraDemographicField.vue';

const DESCRIPTION = 'Age';
const TRANSLATED_DESCRIPTION = 'Not Age';

const ZERO_TO_FIVE = { value: '0-5', defaultLabel: 'Zero to Five' };
const SIX_TO_TEN = { value: '6-10', defaultLabel: 'Six to Ten' };
const ELEVEN_TO_FIFTEEN = { value: '11-15', defaultLabel: 'Eleven to Fifteen' };

const TRANSLATED_OPTION_LABELS = [
  'Less than Five',
  'More than Six but less than Ten',
  'More than Eleven but less than Fifteen',
];

const field = {
  id: 'age',
  description: DESCRIPTION,
  enumValues: [ZERO_TO_FIVE, SIX_TO_TEN, ELEVEN_TO_FIFTEEN],
};

const translatedField = {
  ...field,
  translations: { [currentLanguage]: TRANSLATED_DESCRIPTION },
  enumValues: field.enumValues.map((option, index) => ({
    ...option,
    translations: { [currentLanguage]: TRANSLATED_OPTION_LABELS[index] },
  })),
};

const renderComponent = props => {
  return render(ExtraDemographicField, {
    props: {
      value: '',
      ...props,
    },
  });
};

// KSelect gives its control no role or accessible name. The control is the
// field's only tab stop, so reach it the way a keyboard user does.
const tabToSelect = async () => {
  await userEvent.tab();
  return document.activeElement;
};

// KSelect renders its options as list items once it has been opened
const getOptionLabels = () =>
  screen.getAllByRole('listitem').map(option => option.textContent.trim());

// The description is the select's label: it is shown in the control and
// clicking it opens this select's option list.
const openSelectFromDescription = async description => {
  const select = await tabToSelect();
  const label = within(select).getByText(description);
  expect(label).toBeVisible();
  await userEvent.click(label);
};

describe('ExtraDemographicField', () => {
  it('shows the description and the default option labels of a field without translations', async () => {
    renderComponent({ field });

    await openSelectFromDescription(DESCRIPTION);
    expect(getOptionLabels()).toEqual([
      ZERO_TO_FIVE.defaultLabel,
      SIX_TO_TEN.defaultLabel,
      ELEVEN_TO_FIFTEEN.defaultLabel,
    ]);
  });

  it('shows the description and the option labels translated into the current language', async () => {
    renderComponent({ field: translatedField });

    await openSelectFromDescription(TRANSLATED_DESCRIPTION);
    expect(getOptionLabels()).toEqual(TRANSLATED_OPTION_LABELS);
  });

  it('shows the selected option as the value and keeps it selected when the list opens', async () => {
    const { emitted } = renderComponent({ field, value: SIX_TO_TEN.value });

    const select = await tabToSelect();
    // The closed control also holds the hidden option list, so the displayed
    // value is the label that sits outside of it
    expect(within(select).getByText(SIX_TO_TEN.defaultLabel, { ignore: 'li *' })).toBeVisible();

    // Opening the list highlights the selected option, so confirming right
    // away picks that option again
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    expect(emitted().select).toEqual([[SIX_TO_TEN.value]]);
  });

  it('emits the value of the option the user picks', async () => {
    const { emitted } = renderComponent({ field });

    await selectKSelectOption(DESCRIPTION, SIX_TO_TEN.defaultLabel);
    expect(emitted().select).toEqual([[SIX_TO_TEN.value]]);
  });
});
