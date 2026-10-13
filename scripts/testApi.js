require('dotenv').config();
const http = require('http');
const { seedDevices } = require('../seeders/deviceSeeder');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function request(path, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOptions = {
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        if (body) {
            reqOptions.headers['Content-Type'] = 'application/json';
        }

        const req = http.request(url, reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runAllTests() {
    console.log('=====================================================');
    console.log('🚀 Running Comprehensive ElektraServe API Test Suite');
    console.log('=====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, testName, details = '') {
        if (condition) {
            console.log(`  ✅ [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
            failed++;
        }
    }

    try {
        await seedDevices({ clean: true });
        console.log('');

        // --- 1. SYSTEM & DOCUMENTATION ENDPOINTS ---
        console.log('📌 1. System & Health Endpoints');

        const rootRes = await request('/');
        assert(rootRes.status === 200 && rootRes.data.status === 'success', 'GET / (Server Health Check)');

        const dbCheckRes = await request('/api/db-check');
        assert(dbCheckRes.status === 200 && dbCheckRes.data.status === 'success', 'GET /api/db-check (Database Connectivity)');

        const swaggerRes = await request('/api-docs/');
        assert(swaggerRes.status === 200, 'GET /api-docs/ (Swagger UI Documentation)');

        const docsRedirect = await request('/docs');
        assert(docsRedirect.status === 302 && docsRedirect.headers.location === '/api-docs', 'GET /docs (Redirects to /api-docs)');

        // --- 2. DASHBOARD SUMMARY ENDPOINT ---
        console.log('\n📌 2. Dashboard Telemetry Summary');

        const summaryRes = await request('/api/dashboard/summary');
        const summary = summaryRes.data.data;
        assert(
            summaryRes.status === 200 &&
            summary.total === 6 &&
            summary.pending === 2 &&
            summary.registered === 3 &&
            summary.error === 1 &&
            summary.online === 3 &&
            summary.offline === 3,
            'GET /api/dashboard/summary (Computed counts match seeded records)',
            JSON.stringify(summary)
        );

        // --- 3. DEVICE LISTING & FILTERING ---
        console.log('\n📌 3. Device Listing & Filters');

        const allDevicesRes = await request('/api/devices');
        assert(allDevicesRes.status === 200 && Array.isArray(allDevicesRes.data) && allDevicesRes.data.length === 6, 'GET /api/devices (List all 6 devices)');

        const searchRes = await request('/api/devices?q=solar');
        assert(searchRes.status === 200 && searchRes.data.length === 2, 'GET /api/devices?q=solar (Keyword search across name/identifier)');

        const filterPendingRes = await request('/api/devices?registrationStatus=Pending');
        assert(filterPendingRes.status === 200 && filterPendingRes.data.length === 2, 'GET /api/devices?registrationStatus=Pending (Filter by registration status)');

        const filterOnlineRes = await request('/api/devices?deviceStatus=Online');
        assert(filterOnlineRes.status === 200 && filterOnlineRes.data.length === 3, 'GET /api/devices?deviceStatus=Online (Filter by device status)');

        const filterSolutionRes = await request('/api/devices?solutionType=Pump');
        assert(filterSolutionRes.status === 200 && filterSolutionRes.data.length === 1 && filterSolutionRes.data[0].SolutionType === 'Pump', 'GET /api/devices?solutionType=Pump (Filter by solution type)');

        // Pagination tests
        const page1Res = await request('/api/devices?page=1&limit=2');
        assert(
            page1Res.status === 200 &&
            page1Res.data.length === 2 &&
            page1Res.headers['x-total-count'] === '6' &&
            page1Res.headers['x-total-pages'] === '3' &&
            page1Res.headers['x-current-page'] === '1' &&
            page1Res.headers['x-page-size'] === '2',
            'GET /api/devices?page=1&limit=2 (Pagination Page 1 with headers)'
        );

        const page2Res = await request('/api/devices?page=2&limit=2');
        assert(
            page2Res.status === 200 &&
            page2Res.data.length === 2 &&
            page2Res.data[0].DeviceIdentifier === 'DEMO-1004',
            'GET /api/devices?page=2&limit=2 (Pagination Page 2 offset calculation in DESC order)'
        );

        const page3Res = await request('/api/devices?page=3&limit=2');
        assert(
            page3Res.status === 200 &&
            page3Res.data.length === 2 &&
            page3Res.data[0].DeviceIdentifier === 'DEMO-1002',
            'GET /api/devices?page=3&limit=2 (Pagination Page 3 final page in DESC order)'
        );

        // Sorting tests
        const descOrderRes = await request('/api/devices');
        assert(descOrderRes.data[0].DeviceIdentifier === 'DEMO-1006', 'GET /api/devices (Default order is DESC by Id)');

        const ascOrderRes = await request('/api/devices?order=ASC');
        assert(ascOrderRes.data[0].DeviceIdentifier === 'DEMO-1001', 'GET /api/devices?order=ASC (Explicit ASC order supported)');

        // --- 4. GET BY ID & PARAMETER VALIDATION ---
        console.log('\n📌 4. Get By ID & Parameter Validation');

        const getSingleRes = await request('/api/devices/1');
        assert(getSingleRes.status === 200 && getSingleRes.data.DeviceIdentifier === 'DEMO-1001', 'GET /api/devices/1 (Found existing device)');

        const getMissingRes = await request('/api/devices/9999');
        assert(getMissingRes.status === 404, 'GET /api/devices/9999 (Returns 404 for non-existent device)');

        const getInvalidIdRes = await request('/api/devices/abc');
        assert(getInvalidIdRes.status === 400, 'GET /api/devices/abc (Middleware rejects non-integer ID with 400)');

        // --- 5. CREATE DEVICE & VALIDATION ---
        console.log('\n📌 5. Create Device (POST /api/devices)');

        const blankCreateRes = await request('/api/devices', { method: 'POST' }, {
            DeviceIdentifier: '   ',
            DeviceName: '',
            SolutionType: 'InvalidEnum'
        });
        assert(blankCreateRes.status === 400 && Array.isArray(blankCreateRes.data.errors), 'POST /api/devices (Rejects blank fields and invalid enums with 400)');

        const validCreateRes = await request('/api/devices', { method: 'POST' }, {
            DeviceIdentifier: 'DEMO-9999',
            DeviceName: 'Test Microgrid Storage',
            SolutionType: 'Other',
            RegistrationStatus: 'Pending',
            DeviceStatus: 'Offline'
        });
        const createdDevice = validCreateRes.data;
        assert(validCreateRes.status === 201 && createdDevice.Id && createdDevice.DeviceIdentifier === 'DEMO-9999', 'POST /api/devices (Creates device with 201 status)');

        const duplicateCreateRes = await request('/api/devices', { method: 'POST' }, {
            DeviceIdentifier: 'demo-9999', // Case-insensitive test
            DeviceName: 'Duplicate Attempt',
            SolutionType: 'Other'
        });
        assert(duplicateCreateRes.status === 409, 'POST /api/devices (Case-insensitive duplicate identifier returns 409 Conflict)');

        // --- 6. UPDATE DEVICE (PUT /api/devices/:id) ---
        console.log('\n📌 6. Update Device (PUT /api/devices/:id)');

        const emptyUpdateRes = await request(`/api/devices/${createdDevice.Id}`, { method: 'PUT' }, {});
        assert(emptyUpdateRes.status === 400, 'PUT /api/devices/:id (Rejects empty payload with 400)');

        const validUpdateRes = await request(`/api/devices/${createdDevice.Id}`, { method: 'PUT' }, {
            DeviceName: 'Updated Microgrid Storage Label',
            SolutionType: 'Solar'
        });
        assert(validUpdateRes.status === 200 && validUpdateRes.data.DeviceName === 'Updated Microgrid Storage Label', 'PUT /api/devices/:id (Updates fields and refreshes UpdatedAtUtc)');

        const updateMissingRes = await request('/api/devices/9999', { method: 'PUT' }, { DeviceName: 'Ghost' });
        assert(updateMissingRes.status === 404, 'PUT /api/devices/9999 (Returns 404 for missing device)');

        // --- 7. ACTION BUTTONS & BUSINESS LOGIC ---
        console.log('\n📌 7. Action Buttons & State Transitions');

        // Simulate Online
        const onlineActionRes = await request(`/api/devices/${createdDevice.Id}/simulate-online`, { method: 'POST' });
        assert(
            onlineActionRes.status === 200 &&
            onlineActionRes.data.data.DeviceStatus === 'Online' &&
            onlineActionRes.data.data.LastSeenUtc !== null,
            'POST /api/devices/:id/simulate-online (Sets Online & updates LastSeenUtc)'
        );

        // Simulate Offline (Preserves LastSeenUtc)
        const recordedLastSeen = onlineActionRes.data.data.LastSeenUtc;
        const offlineActionRes = await request(`/api/devices/${createdDevice.Id}/simulate-offline`, { method: 'POST' });
        assert(
            offlineActionRes.status === 200 &&
            offlineActionRes.data.data.DeviceStatus === 'Offline' &&
            Math.floor(new Date(offlineActionRes.data.data.LastSeenUtc).getTime() / 1000) === Math.floor(new Date(recordedLastSeen).getTime() / 1000),
            'POST /api/devices/:id/simulate-offline (Sets Offline & preserves LastSeenUtc)'
        );

        // Register
        const registerActionRes = await request(`/api/devices/${createdDevice.Id}/register`, { method: 'POST' });
        assert(
            registerActionRes.status === 200 &&
            registerActionRes.data.data.RegistrationStatus === 'Registered',
            'POST /api/devices/:id/register (Pending -> Registered transition)'
        );

        // Already registered conflict
        const alreadyRegisteredRes = await request(`/api/devices/${createdDevice.Id}/register`, { method: 'POST' });
        assert(alreadyRegisteredRes.status === 409, 'POST /api/devices/:id/register (Already registered returns 409 Conflict without mutating)');

        // Retry Registration on Registered (should reject)
        const retryInvalidRes = await request(`/api/devices/${createdDevice.Id}/retry-registration`, { method: 'POST' });
        assert(retryInvalidRes.status === 400, 'POST /api/devices/:id/retry-registration (Rejects on non-Error device with 400)');

        // Retry Registration on Error device (DEMO-1003)
        const retryValidRes = await request('/api/devices/3/retry-registration', { method: 'POST' });
        assert(
            retryValidRes.status === 200 &&
            retryValidRes.data.data.RegistrationStatus === 'Pending' &&
            retryValidRes.data.data.RegistrationError === null,
            'POST /api/devices/3/retry-registration (Error -> Pending transition & clears error reason)'
        );

        // --- 8. DELETE DEVICE ---
        console.log('\n📌 8. Delete Device (DELETE /api/devices/:id)');

        const deleteRes = await request(`/api/devices/${createdDevice.Id}`, { method: 'DELETE' });
        assert(deleteRes.status === 204, 'DELETE /api/devices/:id (Returns 204 No Content on deletion)');

        const deleteAgainRes = await request(`/api/devices/${createdDevice.Id}`, { method: 'DELETE' });
        assert(deleteAgainRes.status === 404, 'DELETE /api/devices/:id (Returns 404 for already deleted device)');

        // --- 9. UNMATCHED ROUTE 404 ---
        console.log('\n📌 9. Unmatched Route Handling');
        const unmatchedRes = await request('/api/non-existent-route');
        assert(unmatchedRes.status === 404 && unmatchedRes.data.status === 'error', 'GET /api/non-existent-route (Returns 404 structured error)');

        console.log('\n=====================================================');
        console.log(`📊 FINAL RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
        console.log('=====================================================\n');

        // Restore clean demo data
        await seedDevices({ clean: true });

        process.exit(failed > 0 ? 1 : 0);
    } catch (err) {
        console.error('Fatal test error:', err.message);
        process.exit(1);
    }
}

runAllTests();
