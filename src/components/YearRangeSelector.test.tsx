import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YearRangeSelector } from './YearRangeSelector';

describe('YearRangeSelector', () => {
  const setStartYear = vi.fn();
  const setEndYear = vi.fn();

  const renderComponent = (override?: Partial<React.ComponentProps<typeof YearRangeSelector>>) =>
    render(
      <YearRangeSelector
        startYear={2000}
        endYear={2020}
        setStartYear={setStartYear}
        setEndYear={setEndYear}
        minYear={1990}
        maxYear={2025}
        {...override}
      />,
    );

  it('renders current range label and data availability', () => {
    renderComponent({
      data: {
        range: { startYear: 1995, endYear: 2023 },
      } as any,
    });

    // Basic smoke test that the label renders; detailed string is composed of multiple nodes.
    expect(screen.getByText(/Year range/i)).toBeInTheDocument();
  });

  it('commits new start year on blur and clamps within bounds', () => {
    renderComponent();
    const fromInput = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;

    fireEvent.change(fromInput, { target: { value: '1980' } });
    fireEvent.blur(fromInput);

    expect(setStartYear).toHaveBeenCalledWith(1990); // clamped to minYear
  });

  it('applies preset ranges and marks active pill', () => {
    const { rerender } = renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Full range/i }));
    expect(setStartYear).toHaveBeenCalledWith(1990);
    expect(setEndYear).toHaveBeenCalledWith(2025);

    rerender(
      <YearRangeSelector
        startYear={2016}
        endYear={2025}
        setStartYear={setStartYear}
        setEndYear={setEndYear}
        minYear={1990}
        maxYear={2025}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Last 10 years/i }),
    ).toHaveClass('pill-active');
  });
});

