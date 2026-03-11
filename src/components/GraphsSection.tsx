import { useState } from 'react';
import type { CountryDashboardData } from '../types';
import { GRAPHS_SUBSECTION_CONFIG, type GraphsSubsectionId } from '../data/graphsSubsectionConfig';
import { TimeSeriesSection } from './TimeSeriesSection';
import { MacroIndicatorsTimelineSection } from './MacroIndicatorsTimelineSection';
import { EducationOutOfSchoolCompletionTimelineSection } from './EducationOutOfSchoolCompletionTimelineSection';
import { EducationEnrollmentStaffTimelineSection } from './EducationEnrollmentStaffTimelineSection';
import { EducationInstitutionsTimelineSection } from './EducationInstitutionsTimelineSection';
import { LabourUnemploymentTimelineSection } from './LabourUnemploymentTimelineSection';
import { PopulationStructureSection } from './PopulationStructureSection';
import type { Frequency } from '../types';

export type { GraphsSubsectionId };

export interface GraphsSectionProps {
  data?: CountryDashboardData;
  frequency: Frequency;
  setFrequency: (f: Frequency) => void;
  macroFrequency: Frequency;
  setMacroFrequency: (f: Frequency) => void;
  macroHealthFrequency: Frequency;
  setMacroHealthFrequency: (f: Frequency) => void;
  educationOOSFrequency: Frequency;
  setEducationOOSFrequency: (f: Frequency) => void;
  educationEnrollmentStaffFrequency: Frequency;
  setEducationEnrollmentStaffFrequency: (f: Frequency) => void;
  labourFrequency: Frequency;
  setLabourFrequency: (f: Frequency) => void;
  populationStructureFrequency: Frequency;
  setPopulationStructureFrequency: (f: Frequency) => void;
  resampledSeries?: CountryDashboardData['series'];
  resampledMacro?: CountryDashboardData['series'];
  resampledMacroHealth?: CountryDashboardData['series'];
  resampledEducationOOS?: CountryDashboardData['series'];
  resampledEducationEnrollmentStaff?: CountryDashboardData['series'];
  resampledLabour?: CountryDashboardData['series'];
  resampledPopulationStructure?: CountryDashboardData['series'];
}

export function GraphsSection(props: GraphsSectionProps) {
  const {
    data,
    frequency,
    setFrequency,
    macroFrequency,
    setMacroFrequency,
    macroHealthFrequency,
    setMacroHealthFrequency,
    educationOOSFrequency,
    setEducationOOSFrequency,
    educationEnrollmentStaffFrequency,
    setEducationEnrollmentStaffFrequency,
    labourFrequency,
    setLabourFrequency,
    populationStructureFrequency,
    setPopulationStructureFrequency,
    resampledSeries,
    resampledMacro,
    resampledMacroHealth,
    resampledEducationOOS,
    resampledEducationEnrollmentStaff,
    resampledLabour,
    resampledPopulationStructure,
  } = props;

  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [subsectionsExpanded, setSubsectionsExpanded] = useState<Record<GraphsSubsectionId, boolean>>(
    () =>
      GRAPHS_SUBSECTION_CONFIG.reduce(
        (acc, { id }) => ({ ...acc, [id]: true }),
        {} as Record<GraphsSubsectionId, boolean>,
      ),
  );

  const toggleSubsection = (id: GraphsSubsectionId) => {
    setSubsectionsExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="card graphs-section">
      <button
        type="button"
        className="graphs-section-header"
        onClick={() => setSectionExpanded((e) => !e)}
        aria-expanded={sectionExpanded}
        aria-controls="graphs-section-content"
      >
        <span className="graphs-section-chevron" aria-hidden>
          {sectionExpanded ? '▾' : '▸'}
        </span>
        <span className="graphs-section-title">Country trends & timelines</span>
      </button>
      <div id="graphs-section-content" className="graphs-section-content" hidden={!sectionExpanded}>
        <div className="graphs-subsections">
          {GRAPHS_SUBSECTION_CONFIG.map(({ id, label }) => {
            const isExpanded = subsectionsExpanded[id];
            return (
              <div key={id} className="graphs-subsection">
                <button
                  type="button"
                  className="graphs-subsection-header"
                  onClick={() => toggleSubsection(id)}
                  aria-expanded={isExpanded}
                  aria-controls={`graphs-subsection-${id}`}
                >
                  <span className="graphs-subsection-chevron" aria-hidden>
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <span className="graphs-subsection-title">{label}</span>
                </button>
                <div
                  id={`graphs-subsection-${id}`}
                  className="graphs-subsection-content"
                  hidden={!isExpanded}
                >
                  {id === 'unified' && (
                    <TimeSeriesSection
                      data={data}
                      frequency={frequency}
                      setFrequency={setFrequency}
                      resampledSeries={resampledSeries}
                      sectionTitle={label}
                    />
                  )}
                  {id === 'macroEconomic' && (
                    <MacroIndicatorsTimelineSection
                      variant="economic"
                      data={data}
                      frequency={macroFrequency}
                      setFrequency={setMacroFrequency}
                      resampledSeries={resampledMacro}
                      sectionTitle={label}
                    />
                  )}
                  {id === 'macroHealth' && (
                    <MacroIndicatorsTimelineSection
                      variant="health"
                      data={data}
                      frequency={macroHealthFrequency}
                      setFrequency={setMacroHealthFrequency}
                      resampledSeries={resampledMacroHealth}
                      sectionTitle={label}
                    />
                  )}
                  {id === 'educationOOS' && (
                    <EducationOutOfSchoolCompletionTimelineSection
                      data={data}
                      frequency={educationOOSFrequency}
                      setFrequency={setEducationOOSFrequency}
                      resampledSeries={resampledEducationOOS}
                      sectionTitle={label}
                    />
                  )}
                  {id === 'educationEnrollment' && (
                    <EducationEnrollmentStaffTimelineSection
                      data={data}
                      frequency={educationEnrollmentStaffFrequency}
                      setFrequency={setEducationEnrollmentStaffFrequency}
                      resampledSeries={resampledEducationEnrollmentStaff}
                      sectionTitle={label}
                    />
                  )}
                  {id === 'educationInstitutions' && (
                    <EducationInstitutionsTimelineSection
                      data={data}
                      frequency={educationEnrollmentStaffFrequency}
                      setFrequency={setEducationEnrollmentStaffFrequency}
                      resampledSeries={resampledEducationEnrollmentStaff}
                      sectionTitle={label}
                    />
                  )}
                  {id === 'labour' && (
                    <LabourUnemploymentTimelineSection
                      data={data}
                      frequency={labourFrequency}
                      setFrequency={setLabourFrequency}
                      resampledSeries={resampledLabour}
                      sectionTitle={label}
                    />
                  )}
                  {id === 'populationStructure' && (
                    <PopulationStructureSection
                      data={data}
                      frequency={populationStructureFrequency}
                      setFrequency={setPopulationStructureFrequency}
                      resampledSeries={resampledPopulationStructure}
                      sectionTitle={label}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
