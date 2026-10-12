// The columns of the L1, L2 and L3 sheets on the MaGMa page, from left to right. The description is shown when the mouse
// is on the column header.

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
  width: 100,
  editable: true,
};
const name = { field: 'name', title: 'Use Case Name', description: 'A short name.', width: 180, editable: true };
const description = {
  field: 'description',
  title: 'Description',
  description: 'What the use case is about.',
  width: 300,
  editable: true,
};

// The scores of L1 and L2: averages of the use cases one level down.
const averaged = (below: string) => [
  {
    field: 'visibility',
    title: 'Visibility %',
    description: `The average visibility of its ${below} use cases.`,
    width: 95,
  },
  {
    field: 'implementation',
    title: 'Implementation %',
    description: `The average implementation of its ${below} use cases.`,
    width: 140,
  },
  {
    field: 'effectiveness',
    title: 'Effectiveness %',
    description: `The average effectiveness of its ${below} use cases.`,
    width: 125,
  },
  {
    field: 'weight',
    title: 'Weight %',
    description: `The average weight (overall score) of its ${below} use cases.`,
    width: 85,
  },
  {
    field: 'potential',
    title: 'Potential %',
    description: '100% minus the weight: how much the detection can still improve.',
    width: 95,
  },
];

const IMPACT = 'IN, THR and OUT impact together make 100%.';

export const USE_CASE_COLUMNS: Record<SheetLevel, UseCaseColumn[]> = {
  L1: [
    id,
    name,
    description,
    {
      field: 'L1nrChildren',
      title: 'L2 UC Related',
      description: 'The number of L2 use cases with this use case as their parent.',
      width: 115,
    },
    {
      field: 'L1nrGrandChildren',
      title: 'L3 UC Related',
      description: 'The number of L3 use cases under its L2 use cases.',
      width: 115,
    },
    ...averaged('L2'),
    {
      field: 'inImpact',
      title: 'IN Impact %',
      description: `For a business risk: the part of an attack in the IN phase (getting in), detected by the cumulative IN use cases. ${IMPACT}`,
      width: 100,
      editable: true,
    },
    {
      field: 'thrImpact',
      title: 'THR Impact %',
      description: `For a business risk: the part of an attack in the THROUGH phase (moving through the network), detected by the cumulative THR use cases. ${IMPACT}`,
      width: 120,
      editable: true,
    },
    {
      field: 'outImpact',
      title: 'OUT Impact %',
      description: `For a business risk: the part of an attack in the OUT phase (reaching its goal), detected by the risk's own use cases. ${IMPACT}`,
      width: 120,
      editable: true,
    },
    {
      field: 'risk',
      title: 'Risk',
      description:
        'The chance of missing the attack: 100% minus (IN weight × IN impact + THR weight × THR impact + own weight × OUT impact).',
      width: 55,
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
      width: 150,
      editable: true,
    },
    {
      field: 'L2nrChildren',
      title: 'L3 UC Related',
      description: 'The number of L3 use cases with this use case as their parent.',
      width: 115,
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
      width: 150,
      editable: true,
    },
    {
      field: 'dataSource',
      title: 'Data Source',
      description:
        'Where the data of the rule comes from, such as a log source. The Insights tab shows scores per data source.',
      width: 140,
      editable: true,
    },
    {
      field: 'attackTechniqueId',
      title: 'ATT&CK Technique',
      description:
        'The ATT&CK technique or sub-technique that the rule detects. Its visibility comes from the loaded DeTT&CT file, unless Override is on.',
      width: 170,
      editable: true,
    },
    {
      field: 'visibilityFromAttackTechniqueOverride',
      title: 'Override',
      description: 'On: use your own visibility instead of the DeTT&CT visibility of the technique.',
      width: 75,
      editable: true,
    },
    {
      field: 'visibility',
      title: 'Visibility %',
      description:
        'How much of the data the rule needs is available. Taken from DeTT&CT (yellow) when the rule has a technique and Override is off; otherwise your own value.',
      width: 95,
      editable: true,
    },
    {
      field: 'implementation',
      title: 'Implementation %',
      description:
        'How free of false positives the rule is: 100% minus the share of its alerts that are false positives. A rule without alerts in the period may count as 100%.',
      width: 140,
      editable: true,
    },
    {
      field: 'effectiveness',
      title: 'Effectiveness %',
      description:
        'How well the rule is tested, so it does not miss attacks: from 20% (untested) to 100% (tested regularly with attack simulation tools).',
      width: 125,
      editable: true,
    },
    {
      field: 'weight',
      title: 'Weight %',
      description: 'Visibility × implementation × effectiveness: the overall score of the rule.',
      width: 85,
    },
    {
      field: 'potential',
      title: 'Potential %',
      description: '100% minus the weight: how much the rule can still improve.',
      width: 95,
    },
  ],
};
