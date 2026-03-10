import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as useCountryDashboardModule from './hooks/useCountryDashboard';
import * as worldBankModule from './api/worldBank';
import App from './App';

vi.mock('./api/worldBank', () => ({
  clearGlobalCountryMetricsCache: vi.fn(),
  fetchAllCountries: vi.fn().mockResolvedValue([]),
}));

function mockUseCountryDashboardLoading() {
  vi.spyOn(useCountryDashboardModule, 'useCountryDashboard').mockReturnValue({
    data: null,
    loading: true,
    error: null,
    countryCode: 'IDN',
    setCountryCode: vi.fn(),
    frequency: 'annual',
    setFrequency: vi.fn(),
    macroFrequency: 'annual',
    setMacroFrequency: vi.fn(),
    macroHealthFrequency: 'annual',
    setMacroHealthFrequency: vi.fn(),
    educationOOSFrequency: 'annual',
    setEducationOOSFrequency: vi.fn(),
    educationEnrollmentStaffFrequency: 'annual',
    setEducationEnrollmentStaffFrequency: vi.fn(),
    labourFrequency: 'annual',
    setLabourFrequency: vi.fn(),
    populationStructureFrequency: 'annual',
    setPopulationStructureFrequency: vi.fn(),
    startYear: 2000,
    endYear: 2020,
    setStartYear: vi.fn(),
    setEndYear: vi.fn(),
    resampled: {},
    resampledMacro: {},
    resampledMacroHealth: {},
    resampledEducationOOS: {},
    resampledEducationEnrollmentStaff: {},
    resampledLabour: {},
    resampledPopulationStructure: {},
  } as unknown as ReturnType<typeof useCountryDashboardModule.useCountryDashboard>);
}

describe('App', () => {
  it('renders the main title', () => {
    mockUseCountryDashboardLoading();

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /country analytics platform/i }),
    ).toBeInTheDocument();
  });

  it('shows loading banner when loading and no data', () => {
    mockUseCountryDashboardLoading();

    render(<App />);

    expect(
      screen.getByText(/loading country analytics…/i),
    ).toBeInTheDocument();
  });

  it('calls refresh handler when clicking refresh button', () => {
    vi.spyOn(useCountryDashboardModule, 'useCountryDashboard').mockReturnValue({
      data: null,
      loading: false,
      error: null,
      countryCode: 'IDN',
      setCountryCode: vi.fn(),
      frequency: 'annual',
      setFrequency: vi.fn(),
      macroFrequency: 'annual',
      setMacroFrequency: vi.fn(),
      macroHealthFrequency: 'annual',
      setMacroHealthFrequency: vi.fn(),
      educationOOSFrequency: 'annual',
      setEducationOOSFrequency: vi.fn(),
      educationEnrollmentStaffFrequency: 'annual',
      setEducationEnrollmentStaffFrequency: vi.fn(),
      labourFrequency: 'annual',
      setLabourFrequency: vi.fn(),
      populationStructureFrequency: 'annual',
      setPopulationStructureFrequency: vi.fn(),
      startYear: 2000,
      endYear: 2020,
      setStartYear: vi.fn(),
      setEndYear: vi.fn(),
      resampled: {},
      resampledMacro: {},
      resampledMacroHealth: {},
      resampledEducationOOS: {},
      resampledEducationEnrollmentStaff: {},
      resampledLabour: {},
      resampledPopulationStructure: {},
    } as unknown as ReturnType<typeof useCountryDashboardModule.useCountryDashboard>);
    render(<App />);

    const btn = screen.getByRole('button', { name: /refresh all data from apis/i });
    fireEvent.click(btn);

    expect(worldBankModule.clearGlobalCountryMetricsCache).toHaveBeenCalled();
  });
});


