import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapMetricToolbar, type MapMetricId } from './MapMetricToolbar';

describe('MapMetricToolbar', () => {
  const onChange = vi.fn();

  const renderComponent = (value: MapMetricId = 'gdpNominal') =>
    render(<MapMetricToolbar value={value} onChange={onChange} />);

  it('renders current metric label and toggles dropdown', () => {
    renderComponent('gdpNominal');

    const trigger = screen.getByRole('button', { name: /GDP Nominal/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('calls onChange and closes dropdown when an option is selected', () => {
    renderComponent('gdpNominal');

    const trigger = screen.getByRole('button', { name: /GDP Nominal/i });
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name: /GDP PPP/i });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

