# Common backend utilities

Reusable cross-cutting NestJS code lives here. `decorators/` declares metadata and request helpers; `guards/` reads that metadata and enforces authentication/authorization.

The common layer should not contain feature-specific persistence or route behavior.
