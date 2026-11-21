// The columns of the L1, L2 and L3 sheets on the MaGMa page, from left to right. The description is shown when the mouse
// is on the column header. Each column is at least as wide as its header needs on one line (12.5px bold), with room on
// the right of the centred title for the sort arrow: about 17px for its gap, the arrow and some space before the border.
// The titles have no % sign, so the columns can be narrower: the hint of a column with percentages says 'in %'.

export type SheetLevel = 'L1' | 'L2' | 'L3';

export interface UseCaseColumn {
  field: string; // the use case field shown in the column, or one of the child counts (L1nrChildren, ...)
  title: string;
  description: string;
  width: number; // in pixels
  editable?: boolean; // whether the value can be changed in the sheet
}

const id = {
  field: 'id',
  title: 'ID',
  description: 'The ID of the use case, unique within the domain. When it changes, its child use cases move along.',
  width: 86,
  editable: true,
};
const name = { field: 'name', title: 'Use Case Name', description: 'A short name.', width: 155, editable: true };
const description = {
  field: 'description',
  title: 'Description',
  description: 'What the use case is about.',
  width: 258,
  editable: true,
};

// The scores of L1 and L2: averages of the use cases one level down.
const averaged = (below: string) => [
  {
    field: 'visibility',
    title: 'Visibility',
    description: `The average visibility of its ${below} use cases, in %.`,
    width: 90,
  },
  {
    field: 'implementation',
    title: 'Implementation',
    description: `The average implementation of its ${below} use cases, in %.`,
    width: 132,
  },
  {
    field: 'effectiveness',
    title: 'Effectiveness',
    description: `The average effectiveness of its ${below} use cases, in %.`,
    width: 120,
  },
  {
    field: 'weight',
    title: 'Weight',
    description: `The average weight (overall score) of its ${below} use cases, in %.`,
    width: 80,
  },
  {
    field: 'potential',
    title: 'Potential',
    description: 'How much the detection can still improve, in %: 100% minus the weight.',
    width: 90,
  },
];

const IMPACT = 'IN, THR and OUT impact together make 100%.';

/** The percentages that are typed in a sheet (as text, see percentageInput.ts). */
export const PERCENTAGE_INPUTS = [
  'visibility',
  'implementation',
  'effectiveness',
  'inImpact',
  'thrImpact',
  'outImpact',
];
/** The text fields of one line: Enter ends editing (as in a spreadsheet), and typed or pasted line breaks become spaces. */
export const SINGLE_LINE_FIELDS = ['id', 'name', 'dataSource'];

export const USE_CASE_COLUMNS: Record<SheetLevel, UseCaseColumn[]> = {
  L1: [
    id,
    name,
    description,
    {
      field: 'L1nrChildren',
      title: 'L2 UCs',
      description: 'The number of L2 use cases with this use case as their parent.',
      width: 80,
    },
    {
      field: 'L1nrGrandChildren',
      title: 'L3 UCs',
      description: 'The number of L3 use cases under its L2 use cases.',
      width: 80,
    },
    ...averaged('L2'),
    {
      field: 'inImpact',
      title: 'IN Impact',
      description: `For a business risk, in %: the part of an attack in the IN phase (getting in), detected by the cumulative IN use cases. ${IMPACT}`,
      width: 94,
      editable: true,
    },
    {
      field: 'thrImpact',
      title: 'THR Impact',
      description: `For a business risk, in %: the part of an attack in the THROUGH phase (moving through the network), detected by the cumulative THR use cases. ${IMPACT}`,
      width: 107,
      editable: true,
    },
    {
      field: 'outImpact',
      title: 'OUT Impact',
      description: `For a business risk, in %: the part of an attack in the OUT phase (reaching its goal), detected by the risk's own use cases. ${IMPACT}`,
      width: 108,
      editable: true,
    },
    {
      field: 'risk',
      title: 'Risk',
      description:
        'The risk score, higher is worse: 100% minus (IN weight × IN impact + THR weight × THR impact + own weight × OUT impact).',
      width: 63,
    },
  ],
  L2: [
    id,
    name,
    description,
    {
      field: 'parentIds',
      title: 'Parent Use Case',
      description: 'The L1 use case (a business risk, or IN or THR) that this use case belongs to.',
      width: 143, // a long word such as 'Reconnaissance' fits on a line of the chosen parent
      editable: true,
    },
    {
      field: 'L2nrChildren',
      title: 'L3 UCs',
      description: 'The number of L3 use cases with this use case as their parent.',
      width: 80,
    },
    ...averaged('L3'),
  ],
  L3: [
    id,
    name,
    description,
    {
      field: 'parentIds',
      title: 'Parent Use Case',
      description: 'The L2 use case that this detection rule belongs to.',
      width: 143, // a long word such as 'Reconnaissance' fits on a line of the chosen parent
      editable: true,
    },
    {
      field: 'dataSource',
      title: 'Data Source',
      description:
        'Where the data of the rule comes from, such as a log source. The Insights tab shows scores per data source.',
      width: 120,
      editable: true,
    },
    {
      field: 'attackTechniqueId',
      title: 'ATT&CK Technique',
      description:
        'The ATT&CK technique or sub-technique that the rule detects. Its visibility comes from the loaded DeTT&CT file, unless Override is on.',
      width: 154,
      editable: true,
    },
    {
      field: 'visibilityFromAttackTechniqueOverride',
      title: 'Override',
      description: 'On: use your own visibility instead of the DeTT&CT visibility of the technique.',
      width: 89,
      editable: true,
    },
    {
      field: 'visibility',
      title: 'Visibility',
      description:
        'How much of the data the rule needs is available, in %. Taken from DeTT&CT (yellow) when the rule has a technique and Override is off; otherwise your own value.',
      width: 90,
      editable: true,
    },
    {
      field: 'implementation',
      title: 'Implementation',
      description:
        'How free of false positives the rule is, in %: 100% minus the share of its alerts that are false positives. A rule without alerts in the period may count as 100%.',
      width: 132,
      editable: true,
    },
    {
      field: 'effectiveness',
      title: 'Effectiveness',
      description:
        'How well the rule is tested, so it does not miss attacks, in %: from 20% (untested) to 100% (tested regularly with attack simulation tools).',
      width: 120,
      editable: true,
    },
    {
      field: 'weight',
      title: 'Weight',
      description: 'Visibility × implementation × effectiveness, in %: the overall score of the rule.',
      width: 80,
    },
    {
      field: 'potential',
      title: 'Potential',
      description: 'How much the rule can still improve, in %: 100% minus the weight.',
      width: 90,
    },
  ],
};
