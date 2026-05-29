import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ScoreInputModal from '@/components/ScoreInputModal';
import { useAuth } from '@/context/AuthContext';

const pointsChallenge = {
  id: 1,
  marathon_id: 1,
  title: 'Morning Run',
  description: 'Run every morning',
  challenge_type: 'activity' as const,
  game_type: null,
  points: 100,
  is_general: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  uses_percentage_based_scoring: false,
  editable_by_roles: ['admin'],
};

const percentageChallenge = {
  ...pointsChallenge,
  id: 2,
  title: 'Group Walk',
  uses_percentage_based_scoring: true,
};

const defaultProps = {
  visible: true,
  challenge: pointsChallenge,
  totalFamilyMembers: 5,
  initialPoints: 0,
  initialPercentage: 0,
  onClose: jest.fn(),
  onSubmit: jest.fn().mockResolvedValue(undefined),
};

describe('ScoreInputModal', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ userProfile: { role: 'admin' } });
  });

  it('returns null when user role is not in editable_by_roles', () => {
    (useAuth as jest.Mock).mockReturnValue({ userProfile: { role: 'member' } });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { toJSON } = render(<ScoreInputModal {...defaultProps} />);
    expect(toJSON()).toBeNull();
    alertSpy.mockRestore();
  });

  describe('points mode', () => {
    it('renders the challenge title', () => {
      const { getByText } = render(<ScoreInputModal {...defaultProps} />);
      expect(getByText('Morning Run')).toBeTruthy();
    });

    it('renders a points text input', () => {
      const { getByPlaceholderText } = render(<ScoreInputModal {...defaultProps} />);
      expect(getByPlaceholderText(/Enter points/)).toBeTruthy();
    });

    it('shows max points label', () => {
      const { getByText } = render(<ScoreInputModal {...defaultProps} />);
      expect(getByText(/100/)).toBeTruthy();
    });

    it('calls onSubmit with entered points when valid', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { getByPlaceholderText, getByText } = render(
        <ScoreInputModal {...defaultProps} onSubmit={onSubmit} />
      );
      fireEvent.changeText(getByPlaceholderText(/Enter points/), '80');
      fireEvent.press(getByText('Submit'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(80));
    });

    it('shows alert and does not call onSubmit when points exceed max', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const onSubmit = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <ScoreInputModal {...defaultProps} onSubmit={onSubmit} />
      );
      fireEvent.changeText(getByPlaceholderText(/Enter points/), '200');
      fireEvent.press(getByText('Submit'));
      await waitFor(() => expect(alertSpy).toHaveBeenCalled());
      expect(onSubmit).not.toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('shows alert when points input is not a number', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByPlaceholderText, getByText } = render(<ScoreInputModal {...defaultProps} />);
      fireEvent.changeText(getByPlaceholderText(/Enter points/), 'abc');
      fireEvent.press(getByText('Submit'));
      await waitFor(() => expect(alertSpy).toHaveBeenCalled());
      alertSpy.mockRestore();
    });
  });

  describe('percentage mode', () => {
    it('renders a member count text input', () => {
      const { getByPlaceholderText } = render(
        <ScoreInputModal {...defaultProps} challenge={percentageChallenge} />
      );
      expect(getByPlaceholderText(/Enter number/)).toBeTruthy();
    });

    it('calls onSubmit with challenge.points and computed percentage', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { getByPlaceholderText, getByText } = render(
        <ScoreInputModal {...defaultProps} challenge={percentageChallenge} onSubmit={onSubmit} />
      );
      // 4 of 5 members = 80%
      fireEvent.changeText(getByPlaceholderText(/Enter number/), '4');
      fireEvent.press(getByText('Submit'));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(percentageChallenge.points, 80)
      );
    });

    it('shows alert when member count exceeds totalFamilyMembers', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByPlaceholderText, getByText } = render(
        <ScoreInputModal {...defaultProps} challenge={percentageChallenge} />
      );
      fireEvent.changeText(getByPlaceholderText(/Enter number/), '10');
      fireEvent.press(getByText('Submit'));
      await waitFor(() => expect(alertSpy).toHaveBeenCalled());
      alertSpy.mockRestore();
    });
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<ScoreInputModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
