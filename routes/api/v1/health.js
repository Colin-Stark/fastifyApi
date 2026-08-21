async function healthRoute(fastify, options) {
  console.log('healthRoute called with options:', options);
  fastify.get('/health', async (request, reply) => {
    return { status: 'OK' };
  });
}
module.exports = healthRoute;