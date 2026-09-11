async function exampleRoute(fastify, options) {
  console.log('exampleRoute called with options:', options);

  fastify.get('/example', async (request, reply) => {
    return { message: 'Hello World' };
  });

  fastify.get('/pg-test', async (request, reply) => {
    try {
      const client = await fastify.pg.query('SELECT * FROM users');
      fastify.log.info('PostgreSQL test query executed successfully');
      return {
        message: 'PostgreSQL connection successful',
        data: client.rows
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'PostgreSQL connection failed', details: err.message });
    }
  });
}

export default exampleRoute;