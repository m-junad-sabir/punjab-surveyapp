import { IndustrialUnitService, ApproveRejectDto } from '../bll/services/industrial-unit.service';
export declare class IndustrialUnitController {
    private readonly unitService;
    constructor(unitService: IndustrialUnitService);
    findAll(): Promise<import("../dal/entities/industrial-unit.entity").IndustrialUnit[]>;
    findOne(id: string): Promise<import("../dal/entities/industrial-unit.entity").IndustrialUnit>;
    approve(id: string, body: ApproveRejectDto, user: any): Promise<{
        message: string;
    }>;
    reject(id: string, body: ApproveRejectDto, user: any): Promise<{
        message: string;
    }>;
}
