import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
export declare class RbacGuard implements CanActivate {
    private readonly jwtService;
    private readonly reflector;
    private readonly dataSource;
    constructor(jwtService: JwtService, reflector: Reflector, dataSource: DataSource);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
