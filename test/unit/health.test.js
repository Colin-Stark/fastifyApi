import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify from 'fastify';
import healthCheck from '../../routes/api/v1/health.js';

describe('Health Check Route', () => {
    let app;

    beforeEach(() => {
        app = fastify();
        app.register(healthCheck);
    });

    afterEach(async () => {
        await app.close();
    });

    // Test the health check route
    it('should return 200 OK with status "ok"', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/health'
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ status: 'OK' });
    });

    // check the health with post method
    it('should return 404 Method Not Allowed', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/health'
        });
        expect(response.statusCode).toBe(404);
    });

});