import { verifyToken } from '../../../utils/auth.js';

async function accountsRoute(fastify, options) {
    // GET /accounts - List all accounts for authenticated user
    fastify.get('/accounts', {
        schema: {
            tags: ['accounts'],
            summary: 'Get all accounts for the authenticated user',
            description: 'Returns a list of all accounts belonging to the authenticated user. Optional filtering by account type.',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    account_type: {
                        type: 'string',
                        enum: ['checking', 'savings', 'credit'],
                        description: 'Filter accounts by type (checking, savings, credit)'
                    }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    description: 'Successful response with accounts list',
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            user_id: { type: 'string', format: 'uuid' },
                            account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                            balance: { type: 'string', pattern: '\\d+\\.\\d{2}' }, // numeric as string for JSON
                            created_at: { type: 'string', format: 'date-time' },
                            updated_at: { type: 'string', format: 'date-time' }
                        }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(fastify, request, reply);
        if (!verified) return; // verifyToken already sent response if failed

        try {
            const userId = request.user.sub; // From JWT payload
            let query = 'SELECT id, user_id, account_type, balance, created_at, updated_at FROM accounts WHERE user_id = $1';
            const values = [userId];

            // Add account_type filter if provided
            if (request.query.account_type) {
                query += ' AND account_type = $2';
                values.push(request.query.account_type);
            }

            query += ' ORDER BY created_at DESC';

            const result = await fastify.pg.query(query, values);
            return reply.send(result.rows);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // GET /accounts/:id - Get specific account by ID
    fastify.get('/accounts/:id', {
        schema: {
            tags: ['accounts'],
            summary: 'Get a specific account by ID',
            description: 'Returns a single account by their ID. Must belong to the authenticated user.',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    description: 'Successful response with account data',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                        balance: { type: 'string', pattern: '\\d+\\.\\d{2}' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                403: {
                    description: 'Forbidden - account does not belong to user',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                404: {
                    description: 'Account not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(fastify, request, reply);
        if (!verified) return;

        const { id } = request.params;
        const userId = request.user.sub; // From JWT payload

        try {
            const result = await fastify.pg.query(
                'SELECT id, user_id, account_type, balance, created_at, updated_at FROM accounts WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (result.rows.length === 0) {
                // Check if account exists at all (to differentiate between not found and forbidden)
                const accountCheck = await fastify.pg.query(
                    'SELECT id FROM accounts WHERE id = $1',
                    [id]
                );

                if (accountCheck.rows.length === 0) {
                    return reply.status(404).send({ error: 'Account not found', details: `No account found with id ${id}` });
                } else {
                    return reply.status(403).send({ error: 'Forbidden', details: 'Account does not belong to the authenticated user' });
                }
            }

            return reply.send(result.rows[0]);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // POST /accounts - Create new account
    fastify.post('/accounts', {
        schema: {
            tags: ['accounts'],
            summary: 'Create a new account',
            description: 'Creates a new account for the authenticated user with the specified account type. Initial balance is set to 0.00.',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['account_type'],
                properties: {
                    account_type: {
                        type: 'string',
                        enum: ['checking', 'savings', 'credit'],
                        description: 'Type of account to create (checking, savings, credit)'
                    }
                },
                additionalProperties: false
            },
            response: {
                201: {
                    description: 'Account successfully created',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        user_id: { type: 'string', format: 'uuid' },
                        account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                        balance: { type: 'string', pattern: '\\d+\\.\\d{2}' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    },
                    example: {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "account_type": "checking",
                        "balance": "0.00",
                        "created_at": "2023-01-01T12:00:00Z",
                        "updated_at": "2023-01-01T12:00:00Z"
                    }
                },
                400: {
                    description: 'Validation error - missing or invalid fields',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                409: {
                    description: 'Conflict - user already has an account of this type',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    },
                    example: {
                        error: 'Conflict',
                        details: 'User already has an account of this type'
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(fastify, request, reply);
        if (!verified) return;

        const { account_type } = request.body;
        const userId = request.user.sub; // From JWT payload

        try {
            // Check if user already has an account of this type
            const existingAccount = await fastify.pg.query(
                'SELECT * FROM accounts WHERE user_id = $1 AND account_type = $2',
                [userId, account_type]
            );

            if (existingAccount.rows.length > 0) {
                return reply.status(409).send({
                    error: 'Account type already exists',
                    details: `User already has an account of type ${account_type}`
                });
            }

            // Create new account with balance 0.00
            const result = await fastify.pg.query(
                'INSERT INTO accounts (user_id, account_type, balance) VALUES ($1, $2, $3) RETURNING id, user_id, account_type, balance, created_at, updated_at',
                [userId, account_type, '0.00']
            );

            return reply.status(201).send(result.rows[0]);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // DELETE /accounts/:id - Delete account
    fastify.delete('/accounts/:id', {
        schema: {
            tags: ['accounts'],
            summary: 'Delete an account',
            description: 'Deletes an account by their ID. Must belong to the authenticated user and have a zero balance.',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    description: 'Account successfully deleted',
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        id: { type: 'string', format: 'uuid' }
                    }
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                403: {
                    description: 'Forbidden - account does not belong to user',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                400: {
                    description: 'Bad request - account balance is not zero',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                404: {
                    description: 'Account not found',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(fastify, request, reply);
        if (!verified) return;

        const { id } = request.params;
        const userId = request.user.sub; // From JWT payload

        try {
            // First check if account exists and belongs to user
            const accountCheck = await fastify.pg.query(
                'SELECT id, balance FROM accounts WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (accountCheck.rows.length === 0) {
                // Check if account exists at all (to differentiate between not found and forbidden)
                const accountExists = await fastify.pg.query(
                    'SELECT id FROM accounts WHERE id = $1',
                    [id]
                );

                if (accountExists.rows.length === 0) {
                    return reply.status(404).send({ error: 'Account not found', details: `No account found with id ${id}` });
                } else {
                    return reply.status(403).send({ error: 'Forbidden', details: 'Account does not belong to the authenticated user' });
                }
            }

            const account = accountCheck.rows[0];

            // Check if balance is zero
            if (parseFloat(account.balance) !== 0) {
                return reply.status(400).send({
                    error: 'Cannot delete account with non-zero balance',
                    details: `Account balance must be zero to delete. Current balance: ${account.balance}`
                });
            }

            // Delete the account
            const result = await fastify.pg.query(
                'DELETE FROM accounts WHERE id = $1 RETURNING id',
                [id]
            );

            return reply.send({ message: 'Account deleted successfully', id });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });
}

export default accountsRoute;