import { render, screen } from '@testing-library/vue';
import PrintableIdCards from '../PrintableIdCards.vue';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

const LEARNERS = [
  { id: '1', full_name: 'Alice', username: 'alice', qr_login_token: 'tok1', profile_image: null },
  { id: '2', full_name: 'Bob', username: 'bob', qr_login_token: 'tok2', profile_image: 'data:image/png;base64,xyz' },
  { id: '3', full_name: 'Carol', username: 'carol', qr_login_token: null, profile_image: null },
];

describe('PrintableIdCards', () => {
  it('renders one card per learner', () => {
    const { container } = render(PrintableIdCards, {
      props: { learners: LEARNERS },
    });
    const cards = container.querySelectorAll('.id-card');
    expect(cards.length).toBe(3);
  });

  it('renders learner names on the cards', () => {
    render(PrintableIdCards, {
      props: { learners: LEARNERS },
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('renders an empty grid when no learners', () => {
    const { container } = render(PrintableIdCards, {
      props: { learners: [] },
    });
    expect(container.querySelectorAll('.id-card').length).toBe(0);
  });

  it('renders a photo when profile_image is set', () => {
    const { container } = render(PrintableIdCards, {
      props: { learners: [LEARNERS[1]] },
    });
    const photo = container.querySelector('.card-photo');
    expect(photo).toBeTruthy();
    expect(photo).toHaveAttribute('src', 'data:image/png;base64,xyz');
  });

  it('renders a placeholder when no profile_image', () => {
    const { container } = render(PrintableIdCards, {
      props: { learners: [LEARNERS[0]] },
    });
    expect(container.querySelector('.card-photo')).toBeNull();
    expect(container.querySelector('.card-photo-placeholder')).toBeTruthy();
  });

  it('renders brand image when provided', () => {
    const { container } = render(PrintableIdCards, {
      props: { learners: LEARNERS, brandImage: 'data:image/png;base64,logo' },
    });
    const brand = container.querySelector('.brand-img');
    expect(brand).toBeTruthy();
    expect(brand).toHaveAttribute('src', 'data:image/png;base64,logo');
  });

  it('does not render brand area when no brandImage', () => {
    const { container } = render(PrintableIdCards, {
      props: { learners: LEARNERS },
    });
    expect(container.querySelector('.card-brand')).toBeNull();
  });
});
