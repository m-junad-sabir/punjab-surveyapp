export declare class DuplicateFlag {
    id: number;
    unit_id: string;
    matched_unit_id: string;
    reason: string;
    details: string | null;
    name_similarity: number;
    distance_m: number;
    resolution: string;
    resolved_by: string;
    resolved_at: Date;
    created_at: Date;
}
