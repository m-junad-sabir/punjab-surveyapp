export declare abstract class NamedReference {
    id: number;
    name: string;
    code: string;
}
export declare class District extends NamedReference {
    division_id: number;
}
export declare class Tehsil extends NamedReference {
    district_id: number;
    urban_rural: string;
}
export declare class Sector extends NamedReference {
    parent_sector_id: number;
}
export declare class IndustrialEstate extends NamedReference {
    estate_type: string;
    district_id: number;
}
