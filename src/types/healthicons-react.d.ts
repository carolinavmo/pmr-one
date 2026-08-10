// healthicons-react ships its "./outline" subpath export without a
// "types" condition in package.json's exports map, so TypeScript's
// bundler resolution can't find the sibling .d.mts it does actually
// ship (confirmed present at dist/esm/outline/index.d.mts) — a
// packaging gap, not a real missing-types situation. This ambient
// module fills that gap for exactly the icon names medicalIcons.ts
// imports, typed the same as the package's own declared icon shape
// (dist/icon.d.ts).
declare module "healthicons-react/outline" {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

  type Icon = ForwardRefExoticComponent<Omit<SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>>;

  export const Spine: Icon;
  export const Arm: Icon;
  export const Joints: Icon;
  export const Skeleton: Icon;
  export const Leg: Icon;
  export const Foot: Icon;

  export const Xray: Icon;
  export const Sonography: Icon;
  export const UltrasoundScanner: Icon;
  export const Radiology: Icon;
  export const Microscope: Icon;

  export const Stethoscope: Icon;
  export const BloodPressure: Icon;
  export const Thermometer: Icon;
  export const PulseOximeter: Icon;

  export const SyringeVaccine: Icon;
  export const Biopsy: Icon;
  export const Cpr: Icon;
  export const Defibrillator: Icon;
  export const IntravenousDrip: Icon;
  export const IntravenousBag: Icon;
  export const Stitches: Icon;
  export const Staples: Icon;
  export const Cast: Icon;
  export const Sling: Icon;
  export const Bandaged: Icon;

  export const PhysicalTherapy: Icon;
  export const OccupationalTherapy: Icon;
  export const SpeechLanguageTherapy: Icon;
  export const Exercise: Icon;
  export const ExerciseBicycle: Icon;
  export const ExerciseYoga: Icon;
  export const Walking: Icon;
  export const Running: Icon;
  export const Swim: Icon;
  export const Gym: Icon;
  export const Weights: Icon;
  export const Wheelchair: Icon;
  export const WheelchairAlt: Icon;
  export const Crutches: Icon;
  export const Cane: Icon;

  export const BackPain: Icon;
  export const Headache: Icon;
  export const Fever: Icon;
  export const FeverEmotions: Icon;
  export const Coughing: Icon;
  export const Diarrhea: Icon;
  export const Nausea: Icon;
  export const Diabetes: Icon;
  export const Asthma: Icon;
  export const AutoimmuneDisease: Icon;
  export const Traumatism: Icon;
  export const Pain: Icon;
  export const PainManagment: Icon;

  export const Cardiology: Icon;
  export const Neurology: Icon;
  export const Orthopaedics: Icon;
  export const Rheumatology: Icon;
  export const Gastroenterology: Icon;
  export const Nephrology: Icon;
  export const Urology: Icon;
  export const Endocrinology: Icon;
  export const Geriatrics: Icon;
  export const Pediatrics: Icon;
  export const Gynecology: Icon;
  export const Psychology: Icon;
  export const Oncology: Icon;
  export const Odontology: Icon;
  export const NeuroSurgery: Icon;
  export const GeneralSurgery: Icon;
  export const PediatricSurgery: Icon;

  export const OxygenTank: Icon;
  export const Ventilator: Icon;
  export const VentilatorAlt: Icon;
  export const HearingAid: Icon;

  export const Doctor: Icon;
  export const Nurse: Icon;
  export const HealthWorker: Icon;
  export const Ambulance: Icon;
  export const Telemedicine: Icon;
  export const MedicalAdvice: Icon;
  export const MedicalRecords: Icon;
  export const MedicalSample: Icon;
  export const MedicalSearch: Icon;
  export const ICertificatePaper: Icon;
  export const ChartBar: Icon;
}
