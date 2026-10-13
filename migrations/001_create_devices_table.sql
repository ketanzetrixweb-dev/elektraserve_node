-- UP
CREATE TABLE IF NOT EXISTS devices (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    DeviceIdentifier VARCHAR(50) NOT NULL UNIQUE,
    DeviceName VARCHAR(100) NOT NULL,
    SolutionType VARCHAR(30) NOT NULL,
    RegistrationStatus VARCHAR(20) NOT NULL DEFAULT 'Pending',
    DeviceStatus VARCHAR(20) NOT NULL DEFAULT 'Offline',
    LastSeenUtc DATETIME NULL,
    RegistrationError VARCHAR(250) NULL,
    CreatedAtUtc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAtUtc DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_device_identifier (DeviceIdentifier),
    INDEX idx_solution_type (SolutionType),
    INDEX idx_registration_status (RegistrationStatus),
    INDEX idx_device_status (DeviceStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOWN
DROP TABLE IF EXISTS devices;
