import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import serverPlugin from '../../routes/api/v1/server';

describe('Server Route', () => {
    let app;

    beforeAll(async () => {
        app = fastify();
        app.register(serverPlugin);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should return server route message', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/server'
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(JSON.parse(response.payload)).toEqual({ message: 'Server Route' });
    });

    it('should return 404 for POST to /server', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/server'
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 404 for PUT to /server', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/server'
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 404 for DELETE to /server', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/server'
        });

        expect(response.statusCode).toBe(404);
    });

    it('should return 404 for PATCH to /server', async () => {
        const response = await app.inject({
            method: 'PATCH',
            url: '/server'
        });

        expect(response.statusCode).toBe(404);
    });

    it('should handle HEAD request to /server', async () => {
        const response = await app.inject({
            method: 'HEAD',
            url: '/server'
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        // HEAD requests should have no payload
        expect(response.payload.length).toBe(0);
    });

    it('should return 404 for invalid route /server/invalid', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/server/invalid'
        });

        expect(response.statusCode).toBe(404);
    });

    it('should work with query parameters', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/server?test=value&foo=bar'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual({ message: 'Server Route' });
    });

    it('should work with request body (GET with body)', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/server',
            payload: { test: 'data' }
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual({ message: 'Server Route' });
    });

    it('should have correct content-type header', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/server'
        });

        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    });

    it('should respond in reasonable time (<100ms)', async () => {
        const startTime = Date.now();
        const response = await app.inject({
            method: 'GET',
            url: '/server'
        });
        const endTime = Date.now();

        expect(response.statusCode).toBe(200);
        expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle malformed URLs gracefully', async () => {
        // Test various malformed URL patterns
        const malformedUrls = [
            '/server%',
            '/server//',
            '/server/../other',
        ];

        for (const url of malformedUrls) {
            const response = await app.inject({
                method: 'GET',
                url: url
            });
            // These should either be 404 or handled gracefully without crashing
            expect(response.statusCode).toBeOneOf([404, 400]);
        }
    });
});
