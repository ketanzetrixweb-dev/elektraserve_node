const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'ElektraServe IoT Device Management API',
        version: '1.0.0',
        description: 'REST API documentation for managing and monitoring industrial and IoT devices (Solar, Pump, AC, Compressor, LTDB, and others) with real-time status simulation and dashboard telemetry.',
        contact: {
            name: 'ElektraServe Engineering Team'
        }
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Local Development Server'
        }
    ],
    tags: [
        {
            name: 'Dashboard',
            description: 'Telemetry and aggregate device counts'
        },
        {
            name: 'Devices',
            description: 'Core CRUD operations and device queries'
        },
        {
            name: 'Device Actions',
            description: 'Business rules & simulated device connectivity'
        },
        {
            name: 'System',
            description: 'Health checks and database connectivity'
        }
    ],
    paths: {
        '/api/dashboard/summary': {
            get: {
                tags: ['Dashboard'],
                summary: 'Get dashboard telemetry summary',
                description: 'Returns real-time aggregated counts (total, pending, registered, online, offline, error) calculated directly from MySQL records.',
                responses: {
                    200: {
                        description: 'Dashboard metrics calculated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/DashboardSummaryResponse'
                                }
                            }
                        }
                    },
                    500: {
                        description: 'Server error',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/devices': {
            get: {
                tags: ['Devices'],
                summary: 'List devices with optional search, filters, and pagination',
                description: 'Retrieve a list of devices with optional query parameters for search (q), registrationStatus, deviceStatus, solutionType, and pagination using page & limit (or offset & limit). Returns standard pagination headers (X-Total-Count, X-Total-Pages, X-Current-Page, X-Page-Size).',
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        description: 'Page number for pagination (1-based index). Default is 1.',
                        required: false,
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            default: 1,
                            example: 1
                        }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        description: 'Maximum number of items to return per page. Default is 10.',
                        required: false,
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 10,
                            example: 10
                        }
                    },
                    {
                        name: 'offset',
                        in: 'query',
                        description: 'Number of items to skip for offset-based pagination (alternative to page). Default is 0.',
                        required: false,
                        schema: {
                            type: 'integer',
                            minimum: 0,
                            default: 0,
                            example: 0
                        }
                    },
                    {
                        name: 'q',
                        in: 'query',
                        description: 'Search string across DeviceName and DeviceIdentifier',
                        required: false,
                        schema: { type: 'string', example: 'solar' }
                    },
                    {
                        name: 'registrationStatus',
                        in: 'query',
                        description: 'Filter by registration status',
                        required: false,
                        schema: {
                            type: 'string',
                            enum: ['Pending', 'Registered', 'Error'],
                            example: 'Registered'
                        }
                    },
                    {
                        name: 'deviceStatus',
                        in: 'query',
                        description: 'Filter by simulated online/offline connectivity status',
                        required: false,
                        schema: {
                            type: 'string',
                            enum: ['Online', 'Offline'],
                            example: 'Online'
                        }
                    },
                    {
                        name: 'solutionType',
                        in: 'query',
                        description: 'Filter by solution type',
                        required: false,
                        schema: {
                            type: 'string',
                            enum: ['Solar', 'Pump', 'AC', 'Compressor', 'LTDB', 'Other'],
                            example: 'Solar'
                        }
                    },
                    {
                        name: 'sort',
                        in: 'query',
                        description: 'Field to sort by (e.g. Id, CreatedAtUtc, DeviceName). Default is Id.',
                        required: false,
                        schema: {
                            type: 'string',
                            default: 'Id',
                            example: 'Id'
                        }
                    },
                    {
                        name: 'order',
                        in: 'query',
                        description: 'Sort direction (ASC or DESC). Default is DESC.',
                        required: false,
                        schema: {
                            type: 'string',
                            enum: ['ASC', 'DESC'],
                            default: 'DESC',
                            example: 'DESC'
                        }
                    }
                ],
                responses: {
                    200: {
                        description: 'List of devices matching criteria. Pagination metadata is available in response headers.',
                        headers: {
                            'X-Total-Count': {
                                description: 'Total number of items matching filters',
                                schema: { type: 'integer', example: 6 }
                            },
                            'X-Total-Pages': {
                                description: 'Total number of pages based on limit',
                                schema: { type: 'integer', example: 1 }
                            },
                            'X-Current-Page': {
                                description: 'Current page number',
                                schema: { type: 'integer', example: 1 }
                            },
                            'X-Page-Size': {
                                description: 'Items per page limit',
                                schema: { type: 'integer', example: 10 }
                            }
                        },
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/Device'
                                    }
                                }
                            }
                        }
                    },
                    500: {
                        description: 'Server error',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ['Devices'],
                summary: 'Create a new device',
                description: 'Creates a new device record with application-level validation. Enforces case-insensitive uniqueness on DeviceIdentifier.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/CreateDeviceInput'
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: 'Device created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Device'
                                }
                            }
                        }
                    },
                    400: {
                        description: 'Validation Error (blank required fields or invalid enums)',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ValidationErrorResponse'
                                }
                            }
                        }
                    },
                    409: {
                        description: 'Conflict: DeviceIdentifier already exists',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/devices/{id}': {
            get: {
                tags: ['Devices'],
                summary: 'Get a single device by ID',
                description: 'Returns device details for the specified numeric identifier.',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Primary Key ID of the device',
                        schema: { type: 'integer', example: 1 }
                    }
                ],
                responses: {
                    200: {
                        description: 'Device found',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Device'
                                }
                            }
                        }
                    },
                    400: {
                        description: 'Invalid ID parameter (not a positive integer)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    404: {
                        description: 'Device not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            },
            put: {
                tags: ['Devices'],
                summary: 'Update an existing device',
                description: 'Updates editable fields on a device, updates UpdatedAtUtc timestamp, and verifies identifier uniqueness.',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Primary Key ID of the device',
                        schema: { type: 'integer', example: 1 }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/UpdateDeviceInput'
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Device updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Device'
                                }
                            }
                        }
                    },
                    400: {
                        description: 'Validation Error or empty payload',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
                            }
                        }
                    },
                    404: {
                        description: 'Device not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    409: {
                        description: 'Conflict: New DeviceIdentifier belongs to another device',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            },
            delete: {
                tags: ['Devices'],
                summary: 'Delete a device',
                description: 'Deletes the specified device record. Returns 204 No Content on success.',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Primary Key ID of the device to delete',
                        schema: { type: 'integer', example: 1 }
                    }
                ],
                responses: {
                    204: {
                        description: 'Device deleted successfully'
                    },
                    400: {
                        description: 'Invalid ID parameter',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    404: {
                        description: 'Device not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/devices/{id}/register': {
            post: {
                tags: ['Device Actions'],
                summary: 'Register a device',
                description: 'Applies registration business rule: allowed only when status is Pending or Error. Sets status to Registered, clears any error, and refreshes UpdatedAtUtc. Already-registered devices return 409 Conflict.',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Primary Key ID of the device',
                        schema: { type: 'integer', example: 2 }
                    }
                ],
                responses: {
                    200: {
                        description: 'Device registered successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ActionSuccessResponse' }
                            }
                        }
                    },
                    404: {
                        description: 'Device not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    409: {
                        description: 'Conflict: Device is already registered',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/devices/{id}/simulate-online': {
            post: {
                tags: ['Device Actions'],
                summary: 'Simulate device online status',
                description: 'Sets DeviceStatus to Online, updates LastSeenUtc to current UTC time, and updates UpdatedAtUtc.',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Primary Key ID of the device',
                        schema: { type: 'integer', example: 2 }
                    }
                ],
                responses: {
                    200: {
                        description: 'Device connectivity simulated as Online',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ActionSuccessResponse' }
                            }
                        }
                    },
                    404: {
                        description: 'Device not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/devices/{id}/simulate-offline': {
            post: {
                tags: ['Device Actions'],
                summary: 'Simulate device offline status',
                description: 'Sets DeviceStatus to Offline, preserves the existing LastSeenUtc timestamp unchanged, and updates UpdatedAtUtc.',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Primary Key ID of the device',
                        schema: { type: 'integer', example: 1 }
                    }
                ],
                responses: {
                    200: {
                        description: 'Device connectivity simulated as Offline',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ActionSuccessResponse' }
                            }
                        }
                    },
                    404: {
                        description: 'Device not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/devices/{id}/retry-registration': {
            post: {
                tags: ['Device Actions'],
                summary: 'Retry registration for failed devices',
                description: 'Transitions device from Error status back to Pending, clears RegistrationError, and updates UpdatedAtUtc. Only devices in Error status can retry registration (returns 400 for other statuses).',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Primary Key ID of the device in Error status',
                        schema: { type: 'integer', example: 3 }
                    }
                ],
                responses: {
                    200: {
                        description: 'Registration status reset to Pending',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ActionSuccessResponse' }
                            }
                        }
                    },
                    400: {
                        description: 'Bad Request: Device is not in Error status',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    404: {
                        description: 'Device not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/api/db-check': {
            get: {
                tags: ['System'],
                summary: 'Database connection health check',
                description: 'Executes a test query against MySQL (SELECT 1 + 1) to verify database connectivity.',
                responses: {
                    200: {
                        description: 'Database connection is active',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'success' },
                                        message: { type: 'string', example: 'Database connection is active' },
                                        data: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: { result: { type: 'integer', example: 2 } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    500: {
                        description: 'Database query failed',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        schemas: {
            Device: {
                type: 'object',
                properties: {
                    Id: { type: 'integer', example: 1 },
                    DeviceIdentifier: { type: 'string', example: 'DEMO-1001' },
                    DeviceName: { type: 'string', example: 'Rooftop Solar 01' },
                    SolutionType: {
                        type: 'string',
                        enum: ['Solar', 'Pump', 'AC', 'Compressor', 'LTDB', 'Other'],
                        example: 'Solar'
                    },
                    RegistrationStatus: {
                        type: 'string',
                        enum: ['Pending', 'Registered', 'Error'],
                        example: 'Registered'
                    },
                    DeviceStatus: {
                        type: 'string',
                        enum: ['Online', 'Offline'],
                        example: 'Online'
                    },
                    LastSeenUtc: {
                        type: 'string',
                        format: 'date-time',
                        nullable: true,
                        example: '2026-10-13T06:15:30.000Z'
                    },
                    RegistrationError: {
                        type: 'string',
                        nullable: true,
                        example: null
                    },
                    CreatedAtUtc: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-10-13T06:00:00.000Z'
                    },
                    UpdatedAtUtc: {
                        type: 'string',
                        format: 'date-time',
                        example: '2026-10-13T06:15:30.000Z'
                    }
                }
            },
            CreateDeviceInput: {
                type: 'object',
                required: ['DeviceIdentifier', 'DeviceName', 'SolutionType'],
                properties: {
                    DeviceIdentifier: {
                        type: 'string',
                        description: 'Unique synthetic identifier or IMEI (max 50 chars)',
                        example: 'DEMO-2001'
                    },
                    DeviceName: {
                        type: 'string',
                        description: 'Human-readable label (max 100 chars)',
                        example: 'Primary Battery Storage'
                    },
                    SolutionType: {
                        type: 'string',
                        enum: ['Solar', 'Pump', 'AC', 'Compressor', 'LTDB', 'Other'],
                        example: 'Solar'
                    },
                    RegistrationStatus: {
                        type: 'string',
                        enum: ['Pending', 'Registered', 'Error'],
                        default: 'Pending',
                        example: 'Pending'
                    },
                    DeviceStatus: {
                        type: 'string',
                        enum: ['Online', 'Offline'],
                        default: 'Offline',
                        example: 'Offline'
                    },
                    RegistrationError: {
                        type: 'string',
                        nullable: true,
                        example: null
                    }
                }
            },
            UpdateDeviceInput: {
                type: 'object',
                properties: {
                    DeviceIdentifier: { type: 'string', example: 'DEMO-2001' },
                    DeviceName: { type: 'string', example: 'Updated Battery Storage' },
                    SolutionType: {
                        type: 'string',
                        enum: ['Solar', 'Pump', 'AC', 'Compressor', 'LTDB', 'Other'],
                        example: 'Solar'
                    },
                    RegistrationStatus: {
                        type: 'string',
                        enum: ['Pending', 'Registered', 'Error'],
                        example: 'Pending'
                    },
                    DeviceStatus: {
                        type: 'string',
                        enum: ['Online', 'Offline'],
                        example: 'Offline'
                    },
                    RegistrationError: {
                        type: 'string',
                        nullable: true,
                        example: null
                    }
                }
            },
            DashboardSummaryResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                        type: 'object',
                        properties: {
                            total: { type: 'integer', example: 6 },
                            pending: { type: 'integer', example: 2 },
                            registered: { type: 'integer', example: 3 },
                            error: { type: 'integer', example: 1 },
                            online: { type: 'integer', example: 3 },
                            offline: { type: 'integer', example: 3 }
                        }
                    }
                }
            },
            ActionSuccessResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string', example: 'Device DEMO-1002 simulated as Online' },
                    data: {
                        $ref: '#/components/schemas/Device'
                    }
                }
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string', example: 'Device not found' }
                }
            },
            ValidationErrorResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string', example: 'Validation Error: DeviceIdentifier is required' },
                    errors: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['DeviceIdentifier is required and cannot be blank.']
                    }
                }
            }
        }
    }
};

module.exports = {
    swaggerUi,
    swaggerDocument
};
