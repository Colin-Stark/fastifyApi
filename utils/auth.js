// utils/auth.js
/**
 * Verify a JWT attached to the request.
 *
 * @param {import('fastify').FastifyInstance} fastify - the Fastify instance (needs @fastify/jwt)
 * @param {import('fastify').FastifyRequest} request - incoming request
 * @param {import('fastify').FastifyReply} reply - outgoing reply
 * @returns {Promise<boolean|undefined>} true on success; on failure the function
 *          sends a 401 response directly (so the caller can simply `if (!verified) return;`).
 */
export async function verifyToken(fastify, request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = await fastify.jwt.verify(token);

    // Attach decoded payload so route handlers can access request.user
    request.user = decoded;
    return true;
  } catch (err) {
    // Forward the error as a 401 – identical to the current inline behaviour
    return reply
      .status(401)
      .send({ error: 'Unauthorized', details: err.message });
  }
}