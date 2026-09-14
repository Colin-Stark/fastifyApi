import dotenv from 'dotenv';
dotenv.config();

// ======================
// OPTIONAL: Neon connection sanity check
// Comment/delete after verifying connection works
// ======================
// import { Client } from 'pg';

// async function testNeonConnection() {
//     const client = new Client({ connectionString: process.env.DATABASE_URL });
//     try {
//         await client.connect();
//         const res = await client.query('SELECT version()');
//         console.log('✅ Neon connection successful');
//         console.log('   Version:', res.rows[0].version);
//     } catch (err) {
//         console.error('❌ Failed to connect to Neon PostgreSQL:');
//         console.error('   Message:', err.message);
//         console.error('\n   Please check:');
//         console.error('   1. .env file exists and DATABASE_URL is correct');
//         console.error('   2. Neon project is active (not paused/suspended)');
//         console.error('   3. IP allowlist in Neon console includes your current IP');
//         console.error('   4. Username/password in URL are correct');
//         process.exit(1);
//     } finally {
//         await client.end();
//     }
// }

// Uncomment the line below to run the check on startup
// await testNeonConnection();
// ======================

import Fastify from 'fastify';
import autoload from '@fastify/autoload';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgresPlugin from '@fastify/postgres';

// NEW: Import Swagger plugins
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Compute routesDir using __dirname (available in CommonJS)
const routesDir = join(__dirname, '..', 'routes');

// Initialize Fastify instance
const fastify = Fastify({
    logger: true,
    bodyLimit: 1048576 // 1MB - enables built-in JSON and urlencoded body parsing
});

try {
    // Register PostgreSQL plugin with connection string from environment variable
    await fastify.register(postgresPlugin, {
        connectionString: process.env.DATABASE_URL,
    });
    fastify.log.info('✅ PostgreSQL plugin registered successfully');
    console.log('✅ PostgreSQL plugin registered successfully');
}
catch (err) {
    console.error('❌ Failed to register PostgreSQL plugin:');
    console.error('   Message:', err.message);
    fastify.log.error("Failed to register PostgreSQL plugin", err);
    process.exit(1);
}

// REGISTER SWAGGER PLUGINS BEFORE ROUTES
// ======================================

// 1. Register @fastify/swagger (generates the OpenAPI specification)
await fastify.register(swagger, {
    openapi: {
        openapi: '3.0.0',
        info: {
            title: 'Fastify API',
            description: 'API documentation for the Fastify Vercel Docker serverless API',
            version: '0.0.1'
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ]
    }
});

// 2. Register @fastify/swagger-ui (serves the Swagger UI interface)
await fastify.register(swaggerUi, {
    routePrefix: '/docs', // Swagger UI will be available at http://localhost:3000/documentation/
    uiConfig: {
        docExpansion: 'none', // Don't expand any operations by default
        deepLinking: false    // Disable deep linking for simplicity
    },
    staticCSP: true // Enable Content Security Policy for security
});

// ======================================
// END SWAGGER PLUGINS REGISTRATION

// Register autoload
fastify.register(autoload, {
    dir: routesDir,
    ignorePattern: /.*\.(test|spec)\.js$/
});

// Set up error handling middleware
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    return reply
        .code(statusCode)
        .send({ error: error.message, statusCode });
});

// Handle nodemon's SIGUSR2 restart signal
process.on('SIGUSR2', async () => {
    try {
        await fastify.close(); // Gracefully shut down the server
        // After closing, resend SIGUSR2 so nodemon knows the process exited
        process.kill(process.pid, 'SIGUSR2');
    } catch (err) {
        fastify.log.error('Error during SIGUSR2 shutdown:', err);
        process.kill(process.pid, 'SIGUSR2'); // Still exit to let nodemon restart
    }
});

// Conditional local server startup
if (import.meta.main) {
    const start = async () => {
        try {
            const port = process.env.PORT || 3000;
            await fastify.listen({ port, host: '0.0.0.0' });
            fastify.log.info(`Server listening on localhost:${port}`);
        } catch (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    };
    start();
}

// Export Vercel-compatible handler
export default async (req, res) => {
    await fastify.ready();
    fastify.server.emit('request', req, res);
};