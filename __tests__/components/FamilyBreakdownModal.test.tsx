import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FamilyBreakdownModal from '@/components/FamilyBreakdownModal';

const mockFamily = {
  id: 1,
  name: 'Smith Family',
  totalpoints: 850,
  breakdown: [
    {
      source: 'Admin',
      challenge_title: 'Morning Run',
      points_awarded: 100,
      submitted_at: '2026-05-01T08:00:00Z',
    },
    {
      source: 'Self',
      challenge_title: 'Hydration Challenge',
      points_awarded: 50,
      submitted_at: '2026-05-02T09:00:00Z',
    },
  ],
};

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  family: mockFamily,
};

describe('FamilyBreakdownModal', () => {
  it('renders nothing when family is null', () => {
    const { toJSON } = render(
      <FamilyBreakdownModal {...defaultProps} family={null} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the family name', () => {
    const { getByText } = render(<FamilyBreakdownModal {...defaultProps} />);
    expect(getByText('Smith Family')).toBeTruthy();
  });

  it('renders the total points', () => {
    const { getByText } = render(<FamilyBreakdownModal {...defaultProps} />);
    expect(getByText('850')).toBeTruthy();
  });

  it('renders all breakdown item titles', () => {
    const { getByText } = render(<FamilyBreakdownModal {...defaultProps} />);
    expect(getByText(/Morning Run/)).toBeTruthy();
    expect(getByText(/Hydration Challenge/)).toBeTruthy();
  });

  it('renders breakdown item awarded points', () => {
    const { getAllByText } = render(<FamilyBreakdownModal {...defaultProps} />);
    // t() returns the key when no fallback is given, so rendered as "leaderboard.breakdown.points: <n>"
    expect(getAllByText(/leaderboard\.breakdown\.points: 100/).length).toBeGreaterThan(0);
    expect(getAllByText(/leaderboard\.breakdown\.points: 50/).length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <FamilyBreakdownModal {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
