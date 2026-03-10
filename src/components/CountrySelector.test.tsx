import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CountrySelector } from './CountrySelector';
import type { CountryDashboardData } from '../types';

vi.mock('../api/worldBank', () => ({
  fetchAllCountries: vi.fn().mockResolvedValue([
    {
      iso2Code: 'ID',
      iso3Code: 'IDN',
      name: 'Indonesia',
      region: 'East Asia & Pacific',
    },
    {
      iso2Code: 'MY',
      iso3Code: 'MYS',
      name: 'Malaysia',
      region: 'East Asia & Pacific',
    },
  ]),
}));

describe('CountrySelector', () => {
  const setCountryCode = vi.fn();

  beforeEach(() => {
    setCountryCode.mockReset();
  });

  it('prefills search from dashboard data', () => {
    const data = {
      summary: {
        iso2Code: 'ID',
        name: 'Indonesia',
      },
    } as unknown as CountryDashboardData;

    render(<CountrySelector setCountryCode={setCountryCode} data={data} />);

    expect(screen.getByPlaceholderText(/search by name or code/i)).toHaveValue('Indonesia (ID)');
  });

  it('shows suggestions and calls setCountryCode when a suggestion is clicked', async () => {
    render(<CountrySelector setCountryCode={setCountryCode} />);

    const input = screen.getByPlaceholderText(/search by name or code/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'indo' } });

    await waitFor(() =>
      expect(screen.getByText('Indonesia')).toBeInTheDocument(),
    );

    fireEvent.mouseDown(screen.getByText('Indonesia'));

    expect(setCountryCode).toHaveBeenCalledWith('ID');
    expect(input).toHaveValue('Indonesia (ID)');
  });

  it('supports keyboard navigation and selection', async () => {
    render(<CountrySelector setCountryCode={setCountryCode} />);

    const input = screen.getByPlaceholderText(/search by name or code/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() =>
      expect(screen.getByText('Indonesia')).toBeInTheDocument(),
    );

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setCountryCode).toHaveBeenCalled();
  });
});

