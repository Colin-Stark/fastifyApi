import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fastify from 'fastify';
import userPlugin from '../../../routes/api/v1/user';
import postgresPlugin from '@fastify/postgres';
import jwtPlugin from '@fastify/jwt';


import dotenv from 'dotenv';
dotenv.config();

describe('User Login Edge Cases', () => {
    let app;

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

    beforeEach(async () => {
        // Create a test user for login tests
        const timestamp = Date.now();
        const username = `testuser${timestamp}`;
        const email = `testuser${timestamp}@example.com`;
        const password = "password123";

        await app.inject({
            method: 'POST',
            url: '/user/register',
            payload: {
                username: username,
                email: email,
                password: password
            }
        });
    });

    afterEach(async () => {
        // Clean up the test user after each test
        await app.pg.query('DELETE FROM users WHERE username LIKE $1', ['testuser_%']);
    });

    it('should login successfully with valid username credentials', async () => {
        const timestamp = Date.now();
        const username = `testuser${timestamp}`;
        const email = `testuser${timestamp}@example.com`;
        const password = "password123";

        // First register a user
        await app.inject({
            method: 'POST',
            url: '/user/register',
            payload: {
                username: username,
                email: email,
                password: password
            }
        });

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
    });

});