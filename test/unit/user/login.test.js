import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fastify from 'fastify';
import userPlugin from '../../../routes/api/v1/user';
import postgresPlugin from '@fastify/postgres';
import jwtPlugin from '@fastify/jwt';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

describe('User Login Edge Cases', () => {
    let app;
    let createdUserIds = [];

    beforeAll(async () => {
        app = fastify();
        app.register(postgresPlugin, {
            connectionString: process.env.DATABASE_URL
        });
        app.register(jwtPlugin, {
            secret: process.env.JWT_SECRET
        });
        app.register(userPlugin);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    afterEach(async () => {
        // Clean up any users created during the test
        if (createdUserIds.length > 0) {
            for (const userId of createdUserIds) {
                try {
                    // Delete user directly from database using SQL
                    await app.pg.query('DELETE FROM users WHERE id = $1', [userId]);
                } catch (error) {
                    // Ignore cleanup errors - don't let cleanup failures fail the test
                    console.warn(`Failed to cleanup user ${userId}:`, error.message);
                }
            }
            createdUserIds = [];
        }
    });

    // Helper function to create a test user
    const createTestUser = async (username, email, password) => {
        const response = await app.inject({
            method: 'POST',
            url: '/user/register',
            payload: {
                username,
                email,
                password
            }
        });

        expect(response.statusCode).toBe(201);
        const user = response.json();
        createdUserIds.push(user.id);
        return user;
    };

    // Test successful registration (needed for login tests)
    it('should create a new user with valid data', async () => {
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        const response = await app.inject({
            method: 'POST',
            url: '/user/register',
            payload: {
                username: username,
                email: email,
                password: password
            }
        });

        expect(response.statusCode).toBe(201);
        const user = response.json();
        expect(user).toHaveProperty('id');
        expect(user.username).toBe(username);
        expect(user.email).toBe(email);
        expect(user).toHaveProperty('created_at');
        expect(user).toHaveProperty('updated_at');

        // Track user ID for cleanup
        createdUserIds.push(user.id);
    });

    // === VALIDATION EDGE CASES ===

    // Test missing emailOrUsername field
    it('should reject missing emailOrUsername field', async () => {
        const timestamp = Date.now();
        const password = timestamp.toString();

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                // Missing emailOrUsername
                password: password
            }
        });

        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('Bad Request');
    });

    // Test missing password field
    it('should reject missing password field', async () => {
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                username: username,
                email: email
                // Missing password
            }
        });

        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('Bad Request');
    });

    // Test empty emailOrUsername string
    it('should reject empty emailOrUsername string', async () => {
        const timestamp = Date.now();
        const password = timestamp.toString();

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: '', // Empty string
                password: password
            }
        });

        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('Validation failed');
        expect(error.details).toContain('Email/username and password are required');
    });

    // Test empty password string
    it('should reject empty password string', async () => {
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                username: username,
                email: email,
                password: '' // Empty string
            }
        });

        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('Bad Request');
    });

    // Test whitespace-only emailOrUsername field
    it('should treat whitespace-only emailOrUsername as empty after trimming', async () => {
        const timestamp = Date.now();
        const password = timestamp.toString();

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: '   ', // Only spaces
                password: password
            }
        });

        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('Validation failed');
        expect(error.details).toContain('Email/username and password are required');
    });

    // Test whitespace-only password field
    it('should treat whitespace-only password as valid input (not trimmed)', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with whitespace-only password
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username,
                password: '   ' // Only spaces
            }
        });

        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('Bad Request');
    });

    // Test very long emailOrUsername input
    it('should handle very long emailOrUsername input', async () => {
        const timestamp = Date.now();
        const password = timestamp.toString();
        const longInput = 'a'.repeat(255) + '@example.com'; // Very long but valid email format

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: longInput,
                password: password
            }
        });

        // Should return 404 since no user exists with that email
        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.error).toBe('User not found');
    });

    // Test very long password input
    it('should handle very long password input', async () => {
        // First create a user with a reasonable password
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const reasonablePassword = timestamp.toString();

        await createTestUser(username, email, reasonablePassword);

        // Try to login with very long password
        const veryLongPassword = 'x'.repeat(1000);
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username,
                password: veryLongPassword
            }
        });

        expect(response.statusCode).toBe(401);
        const error = response.json();
        expect(error.error).toBe('Invalid credentials');
    });

    // Test SQL injection attempts in emailOrUsername field
    it('should handle SQL injection attempts in emailOrUsername field', async () => {
        const timestamp = Date.now();
        const password = timestamp.toString();

        const sqlInjectionAttempts = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "1' OR '1'='1' --"
        ];

        for (const sqlInjection of sqlInjectionAttempts) {
            const response = await app.inject({
                method: 'POST',
                url: '/user/login',
                payload: {
                    emailOrUsername: sqlInjection,
                    password: password
                }
            });

            // Should return 404 (treated as non-existent user) since parameterized queries prevent injection
            expect(response.statusCode).toBe(404);
            const error = response.json();
            expect(error.error).toBe('User not found');
        }
    });

    // Test SQL injection attempts in password field
    it('should handle SQL injection attempts in password field', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        const sqlInjectionAttempts = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --"
        ];

        for (const sqlInjection of sqlInjectionAttempts) {
            const response = await app.inject({
                method: 'POST',
                url: '/user/login',
                payload: {
                    emailOrUsername: username,
                    password: sqlInjection
                }
            });

            expect(response.statusCode).toBe(401);
            const error = response.json();
            expect(error.error).toBe('Invalid credentials');
        }
    });

    // === AUTHENTICATION EDGE CASES ===

    // Test non-existent username
    it('should return 404 for non-existent username', async () => {
        const timestamp = Date.now();
        const password = timestamp.toString();

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: `nonexistentuser_${timestamp}`,
                password: password
            }
        });

        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.error).toBe('User not found');
        expect(error.details).toContain('No user found with the provided email or username');
    });

    // Test non-existent email
    it('should return 404 for non-existent email', async () => {
        const timestamp = Date.now();
        const password = timestamp.toString();

        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: `nonexistent_${timestamp}@example.com`,
                password: password
            }
        });

        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.error).toBe('User not found');
        expect(error.details).toContain('No user found with the provided email or username');
    });

    // Test correct username with wrong password
    it('should return 401 for correct username with wrong password', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const correctPassword = timestamp.toString();

        await createTestUser(username, email, correctPassword);

        // Try to login with wrong password
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username,
                password: 'wrongpassword123'
            }
        });

        expect(response.statusCode).toBe(401);
        const error = response.json();
        expect(error.error).toBe('Invalid credentials');
        expect(error.details).toContain('Password is incorrect');
    });

    // Test correct email with wrong password
    it('should return 401 for correct email with wrong password', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const correctPassword = timestamp.toString();

        await createTestUser(username, email, correctPassword);

        // Try to login with wrong password
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: email,
                password: 'wrongpassword123'
            }
        });

        expect(response.statusCode).toBe(401);
        const error = response.json();
        expect(error.error).toBe('Invalid credentials');
        expect(error.details).toContain('Password is incorrect');
    });

    // === CASE SENSITIVITY TESTING ===

    // Test email case-insensitive (different case should still work)
    it('should login successfully with case-insensitive email', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with uppercase email
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: email.toUpperCase(), // TESTUSER@EXAMPLE.COM
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // Test username case-sensitive (different case should fail)
    it('should fail login with wrong-case username (case sensitivity)', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`; // lowercase
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with different case username
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: `TestUser_${timestamp}`, // Different case
                password: password
            }
        });

        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.error).toBe('User not found');
    });

    // Test mixed case email (should work)
    it('should login successfully with mixed case email', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with mixed case email
        const mixedCaseEmail = `TeStUsEr_${timestamp}@ExAmPlE.CoM`;
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: mixedCaseEmail,
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // Test mixed case username (should fail if doesn't match exactly)
    it('should fail login with mixed case username that does not match exactly', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`; // all lowercase
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with mixed case username that doesn't match exactly
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: `TestUser_${timestamp}`, // Mixed case
                password: password
            }
        });

        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.error).toBe('User not found');
    });

    // Test exact case username match (should work)
    it('should login successfully with exact case username match', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `TestUser_${timestamp}`; // Mixed case
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with exact case username
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username, // Exact case match
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // === SPECIAL INPUT HANDLING ===

    // Test special characters in emailOrUsername (valid special chars)
    it('should handle special characters in valid email', async () => {
        // First create a user with special characters in email
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `test.user+tag_${timestamp}@sub-domain.example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with the special character email
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: email,
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // Test special characters in password
    it('should handle special characters in password', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = `!@#$%^&*()_+-=[]{}|;':",./<>?`; // Special characters

        await createTestUser(username, email, password);

        // Try to login with the special character password
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username,
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // Test Unicode characters in password
    it('should handle Unicode characters in password', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = `tëstpässwörд`; // Unicode characters

        await createTestUser(username, email, password);

        // Try to login with the Unicode password
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username,
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // Test emailOrUsername with leading/trailing spaces
    it('should trim leading/trailing spaces from emailOrUsername', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with spaces around email
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: `  ${email}  `, // Spaces before and after
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // Test username with leading/trailing spaces
    it('should trim leading/trailing spaces from username', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with spaces around username
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: `  ${username}  `, // Spaces before and after
                password: password
            }
        });

        expect(response.statusCode).toBe(200);
        const loginResponse = response.json();
        expect(loginResponse).toHaveProperty('accessToken');
        expect(loginResponse.user).toHaveProperty('id');
        expect(loginResponse.user.username).toBe(username);
        expect(loginResponse.user.email).toBe(email);
    });

    // Test password with leading/trailing spaces (should NOT trim)
    it('should NOT trim leading/trailing spaces from password', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Try to login with spaces around password (should fail)
        const response = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username,
                password: `  ${password}  ` // Spaces before and after
            }
        });

        expect(response.statusCode).toBe(401);
        const error = response.json();
        expect(error.error).toBe('Invalid credentials');
        expect(error.details).toContain('Password is incorrect');
    });

    // === SUCCESS CASES (EXISTING TESTS, KEPT FOR COMPLETENESS) ===

    // Test successful login with valid username credentials
    it('should login successfully with valid username credentials', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Then login with the username
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: username, // Using username for login
                password: password
            }
        });
        expect(loginResponse.statusCode).toBe(200);
        const responseJson = loginResponse.json();
        expect(responseJson).toHaveProperty('accessToken');
        expect(responseJson.user).toHaveProperty('id');
        expect(responseJson.user.username).toBe(username);
        expect(responseJson.user.email).toBe(email);
    });

    // Test successful login with valid email credentials
    it('should login successfully with valid email credentials', async () => {
        // First create a user
        const timestamp = Date.now();
        const username = `testuser_${timestamp}`;
        const email = `testuser_${timestamp}@example.com`;
        const password = timestamp.toString();

        await createTestUser(username, email, password);

        // Then login with the email
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/user/login',
            payload: {
                emailOrUsername: email, // Using email for login
                password: password
            }
        });
        expect(loginResponse.statusCode).toBe(200);
        const responseJson = loginResponse.json();
        expect(responseJson).toHaveProperty('accessToken');
        expect(responseJson.user).toHaveProperty('id');
        expect(responseJson.user.username).toBe(username);
        expect(responseJson.user.email).toBe(email);
    });
});