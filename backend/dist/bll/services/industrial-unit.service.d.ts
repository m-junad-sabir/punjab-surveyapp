import { EntityManager } from 'typeorm';
export declare class IndustrialUnitService {
    private readonly entityManager;
    constructor(entityManager: EntityManager);
    findAll(): Promise<any>;
    findOne(unitId: string): Promise<any>;
    approveUnit(unitId: string, actionedBy: string): Promise<{
        message: string;
    }>;
    rejectUnit(unitId: string): Promise<{
        message: string;
    }>;
    private ensureExists;
}
