async function serverRoute(fastify, options) {
    console.log('serverRoute called with options:', options);
    fastify.get('/server', async (request, reply) => {
        return { message: 'Server Route' };
    });
}

export default serverRoute;