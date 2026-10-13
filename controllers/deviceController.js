const { Op, UniqueConstraintError } = require('sequelize');
const { Device } = require('../models');

/**
 * Controller for Device CRUD operations and business actions using Sequelize
 */
const deviceController = {
    /**
     * GET /api/devices
     * List devices with optional search (q) and filtering
     */
    async getAllDevices(req, res) {
        try {
            const { q, search, registrationStatus, deviceStatus, solutionType, page, limit, offset, sort, order, sortBy, sortOrder } = req.query;

            const where = {};
            const searchTerm = (q ?? search)?.toString().trim();

            if (searchTerm) {
                where[Op.or] = [
                    { DeviceName: { [Op.like]: `%${searchTerm}%` } },
                    { DeviceIdentifier: { [Op.like]: `%${searchTerm}%` } }
                ];
            }

            if (registrationStatus) {
                where.RegistrationStatus = registrationStatus.toString().trim();
            }

            if (deviceStatus) {
                where.DeviceStatus = deviceStatus.toString().trim();
            }

            if (solutionType) {
                where.SolutionType = solutionType.toString().trim();
            }

            // Pagination calculation: apply pagination if page, limit, or offset are provided
            const isPaging = page !== undefined || limit !== undefined || offset !== undefined;
            const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
            const limitNum = limit !== undefined ? Math.max(1, parseInt(limit, 10)) : (page ? 10 : null);
            const offsetNum = offset !== undefined
                ? Math.max(0, parseInt(offset, 10))
                : (limitNum ? (pageNum - 1) * limitNum : 0);

            // Sorting: default to Id DESC
            const allowedSortColumns = [
                'Id', 'DeviceIdentifier', 'DeviceName', 'SolutionType',
                'RegistrationStatus', 'DeviceStatus', 'LastSeenUtc',
                'CreatedAtUtc', 'UpdatedAtUtc'
            ];
            const requestedSort = (sort || sortBy)?.toString().trim();
            const sortField = allowedSortColumns.includes(requestedSort) ? requestedSort : 'Id';
            const requestedOrder = (order || sortOrder)?.toString().trim().toUpperCase();
            const sortDirection = requestedOrder === 'ASC' ? 'ASC' : 'DESC';

            const queryOptions = {
                where,
                order: [[sortField, sortDirection]]
            };

            if (limitNum) {
                queryOptions.limit = limitNum;
                queryOptions.offset = offsetNum;
            }

            const { count, rows: devices } = await Device.findAndCountAll(queryOptions);

            const effectivePageSize = limitNum || count;
            const totalPages = effectivePageSize > 0 ? Math.max(1, Math.ceil(count / effectivePageSize)) : 1;

            // Set standard pagination response headers
            res.set('X-Total-Count', count.toString());
            res.set('X-Total-Pages', totalPages.toString());
            res.set('X-Current-Page', pageNum.toString());
            res.set('X-Page-Size', (limitNum || count).toString());

            return res.status(200).json(devices);
        } catch (error) {
            console.error('Error fetching devices:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve devices',
                error: error.message
            });
        }
    },

    /**
     * GET /api/devices/:id
     * Return single device by ID or 404
     */
    async getDeviceById(req, res) {
        try {
            const { id } = req.params;
            const device = await Device.findByPk(Number(id));

            if (!device) {
                return res.status(404).json({
                    status: 'error',
                    message: `Device with ID ${id} not found`
                });
            }

            return res.status(200).json(device);
        } catch (error) {
            console.error(`Error fetching device ${req.params.id}:`, error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve device',
                error: error.message
            });
        }
    },

    /**
     * POST /api/devices
     * Create device; return 201 and created record. Duplicate identifier returns 409.
     */
    async createDevice(req, res) {
        try {
            const identifier = req.body.DeviceIdentifier;

            // Case-insensitive duplicate check
            const duplicate = await Device.findByIdentifier(identifier);
            if (duplicate) {
                return res.status(409).json({
                    status: 'error',
                    message: `Device with identifier "${identifier}" already exists.`
                });
            }

            const now = new Date();
            const newDevice = await Device.create({
                ...req.body,
                CreatedAtUtc: req.body.CreatedAtUtc || now,
                UpdatedAtUtc: now
            });

            return res.status(201).json(newDevice);
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({
                    status: 'error',
                    message: `Device with identifier "${req.body.DeviceIdentifier}" already exists.`
                });
            }

            console.error('Error creating device:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to create device',
                error: error.message
            });
        }
    },

    /**
     * PUT /api/devices/:id
     * Update editable fields; 404 if missing; 400 for invalid input; 409 for duplicate identifier.
     */
    async updateDevice(req, res) {
        try {
            const { id } = req.params;
            const device = await Device.findByPk(Number(id));

            if (!device) {
                return res.status(404).json({
                    status: 'error',
                    message: `Device with ID ${id} not found`
                });
            }

            if (req.body.DeviceIdentifier) {
                const duplicate = await Device.findByIdentifier(req.body.DeviceIdentifier, id);
                if (duplicate) {
                    return res.status(409).json({
                        status: 'error',
                        message: `Device with identifier "${req.body.DeviceIdentifier}" already exists.`
                    });
                }
            }

            await device.update({
                ...req.body,
                UpdatedAtUtc: new Date()
            });

            return res.status(200).json(device);
        } catch (error) {
            if (error instanceof UniqueConstraintError || error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({
                    status: 'error',
                    message: `Device with identifier "${req.body.DeviceIdentifier}" already exists.`
                });
            }

            console.error(`Error updating device ${req.params.id}:`, error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to update device',
                error: error.message
            });
        }
    },

    /**
     * DELETE /api/devices/:id
     * Delete device; 204 on success; 404 if missing.
     */
    async deleteDevice(req, res) {
        try {
            const { id } = req.params;
            const device = await Device.findByPk(Number(id));

            if (!device) {
                return res.status(404).json({
                    status: 'error',
                    message: `Device with ID ${id} not found`
                });
            }

            await device.destroy();
            return res.status(204).send();
        } catch (error) {
            console.error(`Error deleting device ${req.params.id}:`, error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to delete device',
                error: error.message
            });
        }
    },

    /**
     * POST /api/devices/:id/register
     * Business rule: Only Pending or Error can be registered.
     * Already Registered returns conflict / 409 without changing data.
     */
    async registerDevice(req, res) {
        try {
            const { id } = req.params;
            const updated = await Device.registerDevice(id);

            return res.status(200).json({
                status: 'success',
                message: `Device ${updated.DeviceIdentifier} registered successfully`,
                data: updated
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }

            console.error(`Error registering device ${req.params.id}:`, error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to register device',
                error: error.message
            });
        }
    },

    /**
     * POST /api/devices/:id/simulate-online
     * Set Online + LastSeenUtc now. Updates UpdatedAtUtc.
     */
    async simulateOnline(req, res) {
        try {
            const { id } = req.params;
            const updated = await Device.simulateOnline(id);

            return res.status(200).json({
                status: 'success',
                message: `Device ${updated.DeviceIdentifier} simulated as Online`,
                data: updated
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }

            console.error(`Error simulating online for device ${req.params.id}:`, error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to simulate online status',
                error: error.message
            });
        }
    },

    /**
     * POST /api/devices/:id/simulate-offline
     * Set Offline. Updates UpdatedAtUtc.
     */
    async simulateOffline(req, res) {
        try {
            const { id } = req.params;
            const updated = await Device.simulateOffline(id);

            return res.status(200).json({
                status: 'success',
                message: `Device ${updated.DeviceIdentifier} simulated as Offline`,
                data: updated
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }

            console.error(`Error simulating offline for device ${req.params.id}:`, error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to simulate offline status',
                error: error.message
            });
        }
    },

    /**
     * POST /api/devices/:id/retry-registration
     * Business rule: Error -> Pending only.
     */
    async retryRegistration(req, res) {
        try {
            const { id } = req.params;
            const updated = await Device.retryRegistration(id);

            return res.status(200).json({
                status: 'success',
                message: `Device ${updated.DeviceIdentifier} registration reset to Pending`,
                data: updated
            });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
            }

            console.error(`Error retrying registration for device ${req.params.id}:`, error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to retry registration',
                error: error.message
            });
        }
    }
};

module.exports = deviceController;
