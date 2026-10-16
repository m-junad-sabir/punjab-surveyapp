export declare class IndustrialUnit {
    id: string;
    unit_code: string | null;
    name: string;
    establishment_year: number | null;
    location: {
        type: 'Point';
        coordinates: [number, number];
    } | null;
    gps_accuracy_m: number | null;
    address: string | null;
    province_id: number | null;
    province_name: string;
    division_id: number | null;
    division_name: string;
    district_id: number | null;
    district_name: string;
    tehsil_id: number | null;
    tehsil_name: string;
    ownership_type_id: number | null;
    legal_structure_id: number | null;
    zone_type_id: number | null;
    zone_type_other_text: string | null;
    psic_division_id: number | null;
    psic_division_text: string | null;
    psic_group_id: number | null;
    psic_group_text: string | null;
    psic_class_id: number | null;
    psic_class_text: string | null;
    industrial_estate_id: number | null;
    industrial_estate_text: string | null;
    industrial_cluster_id: number | null;
    industrial_cluster_text: string | null;
    approval_status: string;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
}
