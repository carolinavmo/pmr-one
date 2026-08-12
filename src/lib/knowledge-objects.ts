// Central vocabulary of Knowledge Object types (spec §11A, §2.1).
// UI components key off this type rather than raw DB table names, since
// a few tables (clinical_pearl_editorial) have storage-driven names that
// don't match how the type should read in code.
export type KnowledgeObjectType =
  | "disease"
  | "examination_maneuver"
  | "treatment_algorithm"
  | "clinical_pearl"
  | "reference"
  | "medical_illustration"
  | "guideline_recommendation"
  | "risk_factor"
  | "imaging_finding"
  | "rehabilitation_protocol"
  | "exercise"
  | "procedure"
  | "anatomy_structure"
  | "clinical_calculator";
