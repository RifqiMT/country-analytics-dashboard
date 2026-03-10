import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphsSection } from './GraphsSection';
import type { Frequency } from '../types';

vi.mock('./TimeSeriesSection', () => ({
  TimeSeriesSection: () => <div data-testid="unified-graph">Unified timeline section</div>,
}));

vi.mock('./MacroIndicatorsTimelineSection', () => ({
  MacroIndicatorsTimelineSection: ({ variant }: { variant: string }) => (
    <div data-testid={`macro-${variant}`}>Macro {variant}</div>
  ),
}));

vi.mock('./EducationOutOfSchoolCompletionTimelineSection', () => ({
  EducationOutOfSchoolCompletionTimelineSection: () => (
    <div data-testid="education-oos">Education OOS</div>
  ),
}));

vi.mock('./EducationEnrollmentStaffTimelineSection', () => ({
  EducationEnrollmentStaffTimelineSection: () => (
    <div data-testid="education-enrollment">Education Enrollment</div>
  ),
}));

vi.mock('./LabourUnemploymentTimelineSection', () => ({
  LabourUnemploymentTimelineSection: () => <div data-testid="labour">Labour</div>,
}));

vi.mock('./PopulationStructureSection', () => ({
  PopulationStructureSection: () => <div data-testid="population-structure">Population Structure</div>,
}));

describe('GraphsSection', () => {
  const makeSetter = () => vi.fn((f: Frequency) => f);

  const renderComponent = () =>
    render(
      <GraphsSection
        data={undefined}
        frequency="yearly"
        setFrequency={makeSetter()}
        macroFrequency="yearly"
        setMacroFrequency={makeSetter()}
        macroHealthFrequency="yearly"
        setMacroHealthFrequency={makeSetter()}
        educationOOSFrequency="yearly"
        setEducationOOSFrequency={makeSetter()}
        educationEnrollmentStaffFrequency="yearly"
        setEducationEnrollmentStaffFrequency={makeSetter()}
        labourFrequency="yearly"
        setLabourFrequency={makeSetter()}
        populationStructureFrequency="yearly"
        setPopulationStructureFrequency={makeSetter()}
      />,
    );

  it('renders graphs section and subsections', () => {
    renderComponent();

    expect(screen.getByText(/Country trends & timelines/i)).toBeInTheDocument();
    expect(screen.getByTestId('unified-graph')).toBeInTheDocument();
    expect(screen.getByTestId('macro-economic')).toBeInTheDocument();
    expect(screen.getByTestId('macro-health')).toBeInTheDocument();
    expect(screen.getByTestId('education-oos')).toBeInTheDocument();
    expect(screen.getByTestId('education-enrollment')).toBeInTheDocument();
    expect(screen.getByTestId('labour')).toBeInTheDocument();
    expect(screen.getByTestId('population-structure')).toBeInTheDocument();
  });

  it('toggles section visibility when header is clicked', () => {
    renderComponent();
    const header = screen.getByRole('button', { name: /Country trends & timelines/i });
    const unified = screen.getByTestId('unified-graph');
    fireEvent.click(header);
    // After collapsing, the parent content container should be hidden
    expect(unified.closest('.graphs-section-content')).toHaveAttribute('hidden');
  });
});

