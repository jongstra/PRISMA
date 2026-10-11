import { defineStore } from 'pinia'
import { loadCatalog } from '@/io/loadCatalog';
import { ownVisibility, techniqueVisibility } from '@/domain/attack/visibility';
import { readDettectFile } from '@/domain/attack/dettect';


// The catalog's data, as tools/build_attack_catalog.ipynb writes it. The visibility fields and active_in_filter change
// while the app is used (for example when a DeTT&CT file is loaded).
export interface SubTechnique {
  name: string;
  external_id: string;
  platforms: string[];
  groups: string[];
  occurrence_groups: number;
  software: string[];
  occurrence_software: number;
  occurrence_total: number;
  data_sources: string[];
  data_components: string[];
  visibility: boolean;
  visibility_ratio: number;
}

export interface Technique extends SubTechnique {
  sub_techniques?: SubTechnique[];
  occurrence_total_order_normalized: number;
  occurrence_groups_order_normalized: number;
  occurrence_software_order_normalized: number;
}

export interface Tactic {
  name: string;
  external_id: string;
  techniques: Technique[];
  technique_count: number;
  subtechnique_count: number;
  all_technique_count: number;
}

/** A data source of a domain (only used by the filter), and the base of the other attributes below. */
export interface Attribute {
  name: string;
  active_in_filter?: boolean; // platforms, data sources and data components: whether the filter on the DeTT&CT page includes it
}

/** A platform, data component, group or software of a domain, with the techniques it applies to (by name). */
export interface TechniqueAttribute extends Attribute {
  techniques: string[];
  subtechniques: string[];
  all_techniques: string[];
  technique_count: number;
  subtechnique_count: number;
  all_technique_count: number;
  hovered?: boolean; // groups and data components: the mouse is on its button in a technique tooltip
  selected?: boolean; // groups and data components: selected on the DeTT&CT page
  selectedInMagmaHeatmap?: boolean; // groups: selected on the MaGMa heatmap
}

/** A data component of a domain, with its quality from the DeTT&CT file. */
export interface DataComponent extends TechniqueAttribute {
  visibility: boolean;
  // The data quality scores (0-5) from the DeTT&CT file, null before one is loaded. Only device_completeness is checked
  // and used; the other scores are copied as they are.
  quality: { device_completeness: number | null; [score: string]: unknown };
}

export interface Domain {
  tactics: Tactic[];
  platforms: TechniqueAttribute[];
  data_sources: Attribute[];
  data_components: DataComponent[];
  groups: TechniqueAttribute[];
  softwares: TechniqueAttribute[];
  // Set by the selection tools (not in the catalog): only show the techniques of the selected groups or components.
  only_show_selected_groups?: boolean;
  only_show_selected_components?: boolean;
  only_show_selected_groups_magma_heatmap?: boolean;
}



/** The store key of each ATT&CK domain ('enterprise-attack' → 'enterprise'). */
const DOMAIN_KEYS: Record<string, 'enterprise' | 'mobile' | 'ics'> = {
  'enterprise-attack': 'enterprise',
  'mobile-attack': 'mobile',
  'ics-attack': 'ics',
};

/** The catalog data of a domain ('enterprise-attack', 'mobile-attack' or 'ics-attack'), or undefined for another value. */
function domainOf(state: { enterprise: unknown; mobile: unknown; ics: unknown }, domain: string): Domain | undefined {
  const key = DOMAIN_KEYS[domain];
  return key ? (state[key] as Domain) : undefined;
}

export const tacticsStore = defineStore('tactics', {
  state: () => ({
    domain: 'enterprise-attack',  // Alternative initial value: 'none'.
    dataLoaded: false,
    attackVersion: '' as string, // the ATT&CK version of the catalog (from its meta block), shown next to the domain buttons
    enterprise: undefined as Domain | undefined, // the catalog data per domain, once it is loaded
    ics: undefined as Domain | undefined,
    mobile: undefined as Domain | undefined,
    searchQuery: '' as string,
    minVisibilityRatio: 0 as number,
    maxVisibilityRatio: 1 as number,
    minTotalOccurrencesBinned: 0 as number,
    pinnedTooltipId: '' as string,
  }),


  getters: {

    /** The catalog data of the selected domain. */
    currentDomain: (state) => domainOf(state, state.domain),

    allTechniquesIdsAndNames: (state) => {
      const tactics = domainOf(state, state.domain)?.tactics || [];

      const allTechniquesIdsAndNames = tactics.flatMap(tactic => {
        return tactic.techniques.map(technique => ({
          id: technique.external_id,
          name: technique.name
        }));
      });

      // Remove duplicates using a Set based on the ID
      const uniqueTechniques = Array.from(new Map(allTechniquesIdsAndNames.map(item => [item.id, item])).values());

      // Sort the array alphabetically based on the ID
      uniqueTechniques.sort((a, b) => a.id.localeCompare(b.id));

      return uniqueTechniques;
    },


    allTechniquesAndSubtechniquesIdsAndNames: (state) => {
      const tactics = domainOf(state, state.domain)?.tactics || [];

      const allTechniquesAndSubtechniquesIdsAndNames = tactics.flatMap(tactic => {
        return tactic.techniques.flatMap(technique => {
          const techniqueData = [
            {
              id: technique.external_id,
              name: technique.name
            }
          ];

          if (technique.sub_techniques) {
            techniqueData.push(...technique.sub_techniques.map(subTechnique => ({
              id: subTechnique.external_id,
              name: subTechnique.name
            })));
          }

          return techniqueData;
        });
      });

      // Remove duplicates using a Set based on the ID
      const uniqueTechniques = Array.from(new Map(allTechniquesAndSubtechniquesIdsAndNames.map(item => [item.id, item])).values());

      // Sort the array alphabetically based on the ID
      uniqueTechniques.sort((a, b) => a.id.localeCompare(b.id));

      return uniqueTechniques;
    },


    domainTechniqueByIdMap: (state) => (domain: string) => {
      const tactics = domainOf(state, domain)?.tactics;

      const domainTechniqueByIdMap: Record<string, Technique | SubTechnique> = {};

      if (tactics) {
        tactics.forEach(tactic => {
          tactic.techniques.forEach(technique => {
            domainTechniqueByIdMap[technique.external_id] = technique;
            if (technique.sub_techniques) {
              technique.sub_techniques.forEach(subTechnique => {
                domainTechniqueByIdMap[subTechnique.external_id] = subTechnique;
              });
            }
          });
        });
      }

      return domainTechniqueByIdMap;
    },


    getDomainTechniqueVisibilityPercentageById(): (id: string, domain: string) => number | null {
      return (id: string, domain: string) => {
        const technique = this.domainTechniqueByIdMap(domain)[id];
        return technique ? technique.visibility_ratio * 100 : null;
      };
    },


    hoveredGroupsTechniquesSet: (state) => {
      const groups = domainOf(state, state.domain)?.groups ?? [];

      // Add all techniques of hovered groups to a list.
      const groupsTechniques: string[] = [];
      groups.forEach(group => {
        if (group?.hovered) {
          groupsTechniques.push(...group.techniques)
        }
      });

      // Remove duplicates in the techniques list, and return it.
      const groupsTechniquesSet = new Set(groupsTechniques);
      return groupsTechniquesSet;
    },


    selectedGroupsTechniquesSet: (state) => {
      const groups = domainOf(state, state.domain)?.groups ?? [];

      // Add all techniques of selected groups to a list.
      const groupsTechniques: string[] = [];
      groups.forEach(group => {
        if (group?.selected) {
          groupsTechniques.push(...group.techniques)
        }
      });

      // Remove duplicates in the techniques list, and return it.
      const groupsTechniquesSet = new Set(groupsTechniques);
      return groupsTechniquesSet;
    },


    selectedGroupsTechniquesSetMagmaHeatmap: (state) => {
      const groups = domainOf(state, state.domain)?.groups ?? [];

      // Add all techniques of selected groups to a list.
      const groupsTechniques: string[] = [];
      groups.forEach(group => {
        if (group?.selectedInMagmaHeatmap) {
          groupsTechniques.push(...group.techniques)
        }
      });

      // Remove duplicates in the techniques list, and return it.
      const groupsTechniquesSet = new Set(groupsTechniques);
      return groupsTechniquesSet;
    },



    hoveredComponentsTechniquesSet: (state) => {
      const components = domainOf(state, state.domain)?.data_components ?? [];

      // Add all techniques of hovered data_components to a list.
      const componentsTechniques: string[] = [];
      components.forEach(component => {
        if (component?.hovered) {
          componentsTechniques.push(...component.techniques)
        }
      });

      // Remove duplicates in the techniques list, and return it.
      const componentsTechniquesSet = new Set(componentsTechniques);
      return componentsTechniquesSet;
    },

    selectedComponentsTechniquesSet: (state) => {
      const components = domainOf(state, state.domain)?.data_components ?? [];

      // Add all techniques of selected data_components to a list.
      const componentsTechniques: string[] = [];
      components.forEach(component => {
        if (component?.selected) {
          componentsTechniques.push(...component.techniques)
        }
      });

      // Remove duplicates in the techniques list, and return it.
      const componentsTechniquesSet = new Set(componentsTechniques);
      return componentsTechniquesSet;
    },


    techniquesOccurrences: (state) => {
      const tactics = domainOf(state, state.domain)?.tactics;

      if (!tactics) {
        return [];
      }

      const techniquesMap: Record<string, { name: string, group_occurrence: number, software_occurrence: number, total_occurrence: number }> = {};

      // Aggregate occurrences
      tactics.forEach(tactic => {
        tactic.techniques.forEach(technique => {
          const { name, software, groups } = technique;
          if (!techniquesMap[name]) {
            techniquesMap[name] = {
              name,
              group_occurrence: groups.length,
              software_occurrence: software.length,
              total_occurrence: groups.length + software.length,
            };
          }
        });
      });

      // Convert map to array without sorting
      return Object.values(techniquesMap);
    },


    // Generalized getter function (attribute_type examples: platform/data_sources/data_components)
    activeAttributes: (state) => (attribute_type: string) => {
      const data = domainOf(state, state.domain)?.[attribute_type as keyof Domain] as Attribute[] | undefined;

      // Check if the attributeType exists in the data
      if (!data) {
        return []; // Return an empty array if attributeType is not found in the data
      }

      // Filter and map the active items based on the attributeType
      const active_attributes = data
        .filter(item => item.active_in_filter) // Filter the array to include only active items.
        .map(item => item.name);

      return active_attributes;
    },

  },


  actions: {

    // Load the ATT&CK catalog. When that fails, the error is passed on to the caller, which shows the message (App.vue).
    async fetchTactics() {
      try {
        this.dataLoaded = false;
        const data = await loadCatalog();
        this.enterprise = data.enterprise;
        this.mobile = data.mobile;
        this.ics = data.ics;
        this.attackVersion = data.meta?.attack_version ?? '';
      } finally {
        this.dataLoaded = true;
      }
    },

    setDomain(newDomain: string) {
      this.domain = newDomain;
    },


    // Load a DeTT&CT data source administration file. The whole file is checked first (see domain/attack/dettect.ts):
    // when it has a problem, an error explains it and nothing changes. Data sources that ATT&CK does not know are ignored
    // and returned, so they can be reported.
    processDettectYaml(data: unknown): { unknownDataSources: string[] } {
      if (!this.enterprise?.tactics) {
        throw new Error('The ATT&CK data is not loaded (yet). Please reload the page.');
      }
      const file = readDettectFile(data, (domain) => (domainOf(this, domain)?.data_components ?? []).map((component) => component.name));

      // Switch to the domain of the file, and start from a clean state for that domain.
      this.domain = file.domain;
      this.resetDomainVisibility(file.domain);
      // readDettectFile only accepts the supported domains, and the catalog has all of them.
      const { tactics, data_components: dataComponents } = domainOf(this, file.domain)!;

      // Apply the quality scores of the data sources (DeTT&CT) to the data components (ATT&CK).
      for (const [name, entry] of file.dataSources) {
        // file.dataSources only has the data sources that are data components of the domain.
        const component = dataComponents.find((component) => component.name === name)!;
        Object.assign(component.quality, entry.data_quality);
        component.visibility = true;
      }

      // Device completeness of every known data source in the file (0-5 in DeTT&CT, here as a fraction 0-1).
      const completeness = file.completeness;

      // Update the visibility of all techniques and sub-techniques of the domain. Techniques and sub-techniques for which
      // ATT&CK lists no data components cannot be detected via data sources; they get visibility_ratio 0 and are left
      // out of the visibility averages (see domain/attack/visibility.ts).
      tactics.forEach((tactic) => {
        tactic.techniques.forEach((technique) => {
          technique.visibility = technique.data_components.some((component: string) => completeness.has(component));
          technique.visibility_ratio = techniqueVisibility(technique, completeness) ?? 0;
          technique.sub_techniques?.forEach((subtechnique) => {
            subtechnique.visibility = subtechnique.data_components.some((component: string) => completeness.has(component));
            subtechnique.visibility_ratio = ownVisibility(subtechnique, completeness) ?? 0;
          });
        });
      });

      return { unknownDataSources: file.unknownDataSources };
    },


    resetDomainVisibility(domain: string) {
      const domainEntry = domainOf(this, domain);
      if (!domainEntry) {
        return;
      }
      const tactics = domainEntry.tactics;
      const data_components = domainEntry.data_components;

      // Reset all components to visibility = false
      data_components.forEach(component => {
        component.visibility = false;
      });

      // Reset all techniques and subtechniques to visibility_ratio = 0
      tactics.forEach((tactic) => {
        tactic.techniques.forEach((technique) => {
          technique.visibility = false;
          technique.visibility_ratio = 0;

          if (typeof technique.sub_techniques !== "undefined") {
            technique.sub_techniques.forEach((subtechnique) => {
              subtechnique.visibility = false;
              subtechnique.visibility_ratio = 0;
            });
          }
        });
      });
    },
  }
});
