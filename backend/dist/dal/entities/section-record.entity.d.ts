declare abstract class SectionRecord {
    survey_id: string;
}
export declare class SectionAEstablishmentIdentity extends SectionRecord {
    establishment_name: string;
    address: string;
    city: string;
    tehsil: string;
    district: string;
    ownership_type: string;
    legal_structure: string;
}
export declare class SectionBOperationalDetails extends SectionRecord {
    operational_status: string;
}
export declare class SectionCCoreSecondaryActivities extends SectionRecord {
    has_secondary_products: boolean;
    summary_remarks: string;
}
export declare class SectionDWorkforce extends SectionRecord {
}
export declare class SectionEBackwardLinkages extends SectionRecord {
}
export declare class SectionFForwardLinkages extends SectionRecord {
}
export declare class SectionGTechnologyProduction extends SectionRecord {
}
export declare class SectionHEnergyWaste extends SectionRecord {
}
export declare class SectionICertificationsCompliances extends SectionRecord {
}
export declare class SectionJStrategicBusinessPlan extends SectionRecord {
}
export declare class SectionKCollaborationsBarriers extends SectionRecord {
}
export declare class SectionAAssociatedEstablishment {
    associated_id: number;
    survey_id: string;
    sr_no: number;
    name_of_establishment: string;
}
export declare class SectionCProduct {
    product_id: number;
    survey_id: string;
    product_category: string;
    sr_no: number;
    product_name: string;
    unit_of_measurement: string;
}
export declare class SectionERawMaterial {
    raw_material_id: number;
    survey_id: string;
    sr_no: number;
    input_name: string;
    unit_of_measurement: string;
}
export declare class SectionFProductSale {
    sale_product_id: number;
    survey_id: string;
    sr_no: number;
    product_name: string;
    unit_of_measurement: string;
}
export declare class SectionGCriticalMachine {
    machine_id: number;
    survey_id: string;
    sr_no: number;
    machine_name: string;
}
export {};
