import { describe, expect, it } from 'vitest';

import { AllCountriesTableSection } from './AllCountriesTableSection';
import { BusinessAnalyticsSection } from './BusinessAnalyticsSection';
import { ChatbotSection } from './ChatbotSection';
import { CorrelationScatterPlot } from './CorrelationScatterPlot';
import { CountrySelector } from './CountrySelector';
import { CountryTableSection } from './CountryTableSection';
import { EducationEnrollmentStaffTimelineSection } from './EducationEnrollmentStaffTimelineSection';
import { EducationOutOfSchoolCompletionTimelineSection } from './EducationOutOfSchoolCompletionTimelineSection';
import { EducationTimelineSection } from './EducationTimelineSection';
import { GlobalChartsSection } from './GlobalChartsSection';
import { GraphsSection } from './GraphsSection';
import { LabourUnemploymentTimelineSection } from './LabourUnemploymentTimelineSection';
import { MacroIndicatorsTimelineSection } from './MacroIndicatorsTimelineSection';
import { MapMetricToolbar } from './MapMetricToolbar';
import { PESTELSection } from './PESTELSection';
import { PopulationStructureSection } from './PopulationStructureSection';
import { Porter5ForcesSection } from './Porter5ForcesSection';
import { RegionFilter } from './RegionFilter';
import { SourceSection } from './SourceSection';
import { SummarySection } from './SummarySection';
import { TimeSeriesSection } from './TimeSeriesSection';
import { ToastProvider } from './ToastProvider';
import { WorldMapSection } from './WorldMapSection';
import { YearRangeSelector } from './YearRangeSelector';

describe('component modules', () => {
  const cases: [string, unknown][] = [
    ['AllCountriesTableSection', AllCountriesTableSection],
    ['BusinessAnalyticsSection', BusinessAnalyticsSection],
    ['ChatbotSection', ChatbotSection],
    ['CorrelationScatterPlot', CorrelationScatterPlot],
    ['CountrySelector', CountrySelector],
    ['CountryTableSection', CountryTableSection],
    ['EducationEnrollmentStaffTimelineSection', EducationEnrollmentStaffTimelineSection],
    ['EducationOutOfSchoolCompletionTimelineSection', EducationOutOfSchoolCompletionTimelineSection],
    ['EducationTimelineSection', EducationTimelineSection],
    ['GlobalChartsSection', GlobalChartsSection],
    ['GraphsSection', GraphsSection],
    ['LabourUnemploymentTimelineSection', LabourUnemploymentTimelineSection],
    ['MacroIndicatorsTimelineSection', MacroIndicatorsTimelineSection],
    ['MapMetricToolbar', MapMetricToolbar],
    ['PESTELSection', PESTELSection],
    ['PopulationStructureSection', PopulationStructureSection],
    ['Porter5ForcesSection', Porter5ForcesSection],
    ['RegionFilter', RegionFilter],
    ['SourceSection', SourceSection],
    ['SummarySection', SummarySection],
    ['TimeSeriesSection', TimeSeriesSection],
    ['ToastProvider', ToastProvider],
    ['WorldMapSection', WorldMapSection],
    ['YearRangeSelector', YearRangeSelector],
  ];

  it.each(cases)('%s is defined', (_name, component) => {
    expect(component).toBeDefined();
  });
});

