import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

const defaultProps = {
  visible: true,
  challengeTitle: 'Morning Run',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe('DeleteConfirmationModal', () => {
  it('renders title and challenge name when visible', () => {
    const { getByText } = render(<DeleteConfirmationModal {...defaultProps} />);
    expect(getByText('Delete Score')).toBeTruthy();
    expect(getByText('Morning Run')).toBeTruthy();
  });

  it('renders the confirmation message', () => {
    const { getByText } = render(<DeleteConfirmationModal {...defaultProps} />);
    expect(
      getByText('Are you sure you want to delete this score? This action cannot be undone.')
    ).toBeTruthy();
  });

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <DeleteConfirmationModal {...defaultProps} onCancel={onCancel} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <DeleteConfirmationModal {...defaultProps} onConfirm={onConfirm} />
    );
    fireEvent.press(getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders different challenge title', () => {
    const { getByText } = render(
      <DeleteConfirmationModal {...defaultProps} challengeTitle="Evening Yoga" />
    );
    expect(getByText('Evening Yoga')).toBeTruthy();
  });
});
