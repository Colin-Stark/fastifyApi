const fastify = require('fastify')({
    logger: true,
    bodyLimit: 1048576 // 1MB - enables built-in JSON and urlencoded body parsing
});

const autoload = require('@fastify/autoload');
const path = require('path');

// Compute routesDir using __dirname (available in CommonJS)
const routesDir = path.join(__dirname, '..', 'routes');

// Register autoload
fastify.register(autoload, {
    dir: routesDir,
    ignorePattern: /.*\.(test|spec)\.js$/,
    // dirNameRoutePrefix: false, // Use directory name as route prefix
});

// Set up error handling middleware
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    return reply
        .code(statusCode)
        .send({ error: error.message, statusCode });
});

// Conditional local server startup
if (require.main === module) {
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
module.exports = async (req, res) => {
    await fastify.ready();
    fastify.server.emit('request', req, res);
};