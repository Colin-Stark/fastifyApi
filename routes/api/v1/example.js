async function exampleRoute(fastify, options) {
  console.log('exampleRoute called with options:', options);

  fastify.get('/example', {
    schema: {
      tags: ['example'],
      summary: 'Example hello world endpoint',
      description: 'Returns a simple hello world message to demonstrate API functionality',
      response: {
        200: {
          description: 'Successful response with hello world message',
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Hello World',
              description: 'Greeting message'
            }
          },
          example: {
            message: 'Hello World'
          }
        }
      }
    }
  }, async (request, reply) => {
    return { message: 'Hello World' };
  });

  fastify.get('/pg-test', {
    schema: {
      tags: ['example', 'database'],
      summary: 'PostgreSQL connection test',
      description: 'Tests the database connection by querying the users table',
      response: {
        200: {
          description: 'Successful database connection test',
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'PostgreSQL connection successful',
              description: 'Confirmation message indicating database connectivity'
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  username: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password_hash: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' }
                }
              }
            }
          },
          example: {
            message: 'PostgreSQL connection successful',
            data: [
              {
                id: '550e8400-e29b-41d4-a716-446655440000',
                username: 'johndoe',
                email: 'john@example.com',
                password_hash: '$2b$10$8J7v1Z7uJ7v1Z7uJ7v1Z7uJ7v1Z7uJ7v1Z7uJ7v1Z7uJ7v1Z7uJ7v',
                created_at: '2023-01-01T12:00:00Z',
                updated_at: '2023-01-01T12:00:00Z'
              }
            ]
          }
        },
        500: {
          description: 'Database connection failed',
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'PostgreSQL connection failed',
              description: 'Error message indicating what went wrong'
            },
            details: {
              type: 'string',
              example: 'connection to database at "localhost:5432" failed: connection refused',
              description: 'Detailed error information for debugging'
            }
          },
          example: {
            error: 'PostgreSQL connection failed',
            details: 'connection to database at "localhost:5432" failed: connection refused'
          }
        }
      }
    }
  }, async (request, reply) => {
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