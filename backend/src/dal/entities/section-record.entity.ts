import { Column, Entity, PrimaryColumn } from 'typeorm';

abstract class SectionRecord {
  @PrimaryColumn('uuid')
  survey_id: string;
}

@Entity({ name: 'section_a_establishment_identity' })
export class SectionAEstablishmentIdentity extends SectionRecord {
  @Column({ length: 255 }) establishment_name: string;
  @Column({ type: 'text' }) address: string;
  @Column({ length: 100 }) city: string;
  @Column({ length: 100 }) tehsil: string;
  @Column({ length: 100 }) district: string;
  @Column({ length: 50, nullable: true }) ownership_type: string;
  @Column({ length: 50, nullable: true }) legal_structure: string;
}

@Entity({ name: 'section_b_operational_details' })
export class SectionBOperationalDetails extends SectionRecord {
  @Column({ length: 50 }) operational_status: string;
}

@Entity({ name: 'section_c_core_secondary_activities' })
export class SectionCCoreSecondaryActivities extends SectionRecord {
  @Column({ default: false }) has_secondary_products: boolean;
  @Column({ type: 'text', nullable: true }) summary_remarks: string;
}

@Entity({ name: 'section_d_workforce' })
export class SectionDWorkforce extends SectionRecord {}
@Entity({ name: 'section_e_backward_linkages' })
export class SectionEBackwardLinkages extends SectionRecord {}
@Entity({ name: 'section_f_forward_linkages' })
export class SectionFForwardLinkages extends SectionRecord {}
@Entity({ name: 'section_g_technology_production' })
export class SectionGTechnologyProduction extends SectionRecord {}
@Entity({ name: 'section_h_energy_waste' })
export class SectionHEnergyWaste extends SectionRecord {}
@Entity({ name: 'section_i_certifications_compliances' })
export class SectionICertificationsCompliances extends SectionRecord {}
@Entity({ name: 'section_j_strategic_business_plan' })
export class SectionJStrategicBusinessPlan extends SectionRecord {}
@Entity({ name: 'section_k_collaborations_barriers' })
export class SectionKCollaborationsBarriers extends SectionRecord {}

@Entity({ name: 'section_a_associated_establishments' })
export class SectionAAssociatedEstablishment {
  @PrimaryColumn() associated_id: number;
  @Column('uuid') survey_id: string;
  @Column() sr_no: number;
  @Column({ length: 255 }) name_of_establishment: string;
}

@Entity({ name: 'section_c_products' })
export class SectionCProduct {
  @PrimaryColumn() product_id: number;
  @Column('uuid') survey_id: string;
  @Column({ length: 20 }) product_category: string;
  @Column() sr_no: number;
  @Column({ length: 255 }) product_name: string;
  @Column({ length: 50 }) unit_of_measurement: string;
}

@Entity({ name: 'section_e_raw_materials' })
export class SectionERawMaterial {
  @PrimaryColumn() raw_material_id: number;
  @Column('uuid') survey_id: string;
  @Column() sr_no: number;
  @Column({ length: 255 }) input_name: string;
  @Column({ length: 50 }) unit_of_measurement: string;
}

@Entity({ name: 'section_f_product_sales' })
export class SectionFProductSale {
  @PrimaryColumn() sale_product_id: number;
  @Column('uuid') survey_id: string;
  @Column() sr_no: number;
  @Column({ length: 255 }) product_name: string;
  @Column({ length: 50 }) unit_of_measurement: string;
}

@Entity({ name: 'section_g_critical_machines' })
export class SectionGCriticalMachine {
  @PrimaryColumn() machine_id: number;
  @Column('uuid') survey_id: string;
  @Column() sr_no: number;
  @Column({ length: 255 }) machine_name: string;
}
