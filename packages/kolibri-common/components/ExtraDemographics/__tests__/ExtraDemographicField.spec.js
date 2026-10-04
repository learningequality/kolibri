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

describe('ExtraDemographicField', () => {
  it('shows the description and the default option labels of a field without translations', async () => {
    renderComponent({ field });

    const select = await tabToSelect();
    expect(within(select).getByText(DESCRIPTION)).toBeVisible();

    await userEvent.click(select);
    expect(getOptionLabels()).toEqual([
      ZERO_TO_FIVE.defaultLabel,
      SIX_TO_TEN.defaultLabel,
      ELEVEN_TO_FIFTEEN.defaultLabel,
    ]);
  });

  it('shows the description and the option labels translated into the current language', async () => {
    renderComponent({ field: translatedField });

    const select = await tabToSelect();
    expect(within(select).getByText(TRANSLATED_DESCRIPTION)).toBeVisible();

    await userEvent.click(select);
    expect(getOptionLabels()).toEqual(TRANSLATED_OPTION_LABELS);
  });

  it('shows the label of the selected option', () => {
    renderComponent({ field, value: SIX_TO_TEN.value });

    expect(screen.getByText(SIX_TO_TEN.defaultLabel)).toBeInTheDocument();
  });

  it('emits the value of the option the user picks', async () => {
    const { emitted } = renderComponent({ field });

    await selectKSelectOption(DESCRIPTION, SIX_TO_TEN.defaultLabel);
    expect(emitted().select).toEqual([[SIX_TO_TEN.value]]);
  });
});
