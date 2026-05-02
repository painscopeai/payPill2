/** Keys must match profile_option_sets seeded in migrations. */
export const CONDITION_GROUPS = [
  { key: 'conditions_cardiovascular', title: 'Cardiovascular' },
  { key: 'conditions_endocrine', title: 'Endocrine & metabolic' },
  { key: 'conditions_kidney', title: 'Kidney & urinary' },
  { key: 'conditions_respiratory', title: 'Respiratory' },
  { key: 'conditions_neurological', title: 'Neurological' },
  { key: 'conditions_mental_health', title: 'Mental health' },
  { key: 'conditions_gi', title: 'Gastrointestinal' },
  { key: 'conditions_msk', title: 'Musculoskeletal' },
  { key: 'conditions_cancer', title: 'Cancer / oncology' },
  { key: 'conditions_infectious', title: 'Infectious disease' },
  { key: 'conditions_autoimmune', title: 'Autoimmune / immune' },
  { key: 'conditions_womens_health', title: "Women's health" },
  { key: 'conditions_mens_health', title: "Men's health" },
  { key: 'conditions_other', title: 'Other history' },
];

export const CONDITION_CATALOG_KEYS = CONDITION_GROUPS.map((g) => g.key);
