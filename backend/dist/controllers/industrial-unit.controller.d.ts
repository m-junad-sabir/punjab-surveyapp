import { IndustrialUnitService } from '../bll/services/industrial-unit.service';
export declare class IndustrialUnitController {
    private unitService;
    constructor(unitService: IndustrialUnitService);
    findAll(): Promise<any>;
    findOne(id: string): Promise<any>;
    approveUnit(id: string, body: {
        response_id?: string;
        remarks?: string;
    }, user: any): Promise<{
        message: string;
    }>;
    rejectUnit(id: string, body: {
        response_id?: string;
        remarks?: string;
    }, user: any): Promise<{
        message: string;
    }>;
}
