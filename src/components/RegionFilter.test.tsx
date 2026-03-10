import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegionFilter } from './RegionFilter';

describe('RegionFilter', () => {
  const onChange = vi.fn();

  const renderComponent = (value: string | null = null) =>
    render(
      <RegionFilter
        regions={['East Asia & Pacific', 'Europe & Central Asia']}
        value={value}
        onChange={onChange}
        placeholder="All regions"
      />,
    );

  it('shows placeholder when no region selected and opens list on focus', () => {
    renderComponent(null);
    const input = screen.getByPlaceholderText(/All regions/i);
    expect(input).toBeInTheDocument();

    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('filters regions by search and selects one', () => {
    renderComponent(null);
    const input = screen.getByPlaceholderText(/All regions/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'east' } });

    const option = screen.getByRole('button', { name: /East Asia & Pacific/i });
    fireEvent.mouseDown(option);

    expect(onChange).toHaveBeenCalledWith('East Asia & Pacific');
  });

  it('allows selecting "All regions" via search', () => {
    renderComponent('East Asia & Pacific');
    const input = screen.getByDisplayValue('East Asia & Pacific');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'all' } });

    const option = screen.getByRole('button', { name: /All regions/i });
    fireEvent.mouseDown(option);

    expect(onChange).toHaveBeenCalledWith(null);
  });
});

