import { verifyToken } from '../../../utils/auth.js';
import { randomUUID } from 'crypto';

async function transactionsRoute(fastify, options) {
    console.log('transactionsRoute called with options:', options);

    // GET /transactions - List transactions for authenticated user with filtering and pagination
    fastify.get('/transactions', {
        schema: {
            tags: ['transactions'],
            summary: 'Get transactions for the authenticated user',
            description: 'Returns a list of transactions for accounts belonging to the authenticated user. Supports filtering by account ID, transaction type, and date range. Supports pagination.',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    account_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Filter transactions by account ID (must belong to authenticated user)'
                    },
                    type: {
                        type: 'string',
                        enum: ['deposit', 'withdrawal', 'transfer'],
                        description: 'Filter transactions by type'
                    },
                    start_date: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Filter transactions created after this date (inclusive)'
                    },
                    end_date: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Filter transactions created before this date (inclusive)'
                    },
                    limit: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 50,
                        description: 'Maximum number of transactions to return'
                    },
                    offset: {
                        type: 'integer',
                        minimum: 0,
                        default: 0,
                        description: 'Number of transactions to skip for pagination'
                    }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    description: 'Successful response with transactions list',
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            account_id: { type: 'string', format: 'uuid' },
                            destination_account_id: { type: ['string', 'null'], format: 'uuid' },
                            account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                            type: { type: 'string', enum: ['deposit', 'withdrawal', 'transfer'] },
                            amount: { type: 'string', pattern: '\\d+\\.\\d{2}' },
                            description: { type: ['string', 'null'] },
                            idempotency_key: { type: 'string', format: 'uuid' },
                            created_at: { type: 'string', format: 'date-time' }
                        }
                    }
                },
                400: {
                    description: 'Validation error - invalid query parameters',
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
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(fastify, request, reply);
        if (!verified) return; // verifyToken already sent response if failed

        try {
            const userId = request.user.sub; // From JWT payload
            let query = `
                SELECT t.id, t.account_id, t.destination_account_id, t.type, t.amount, t.description, t.idempotency_key, t.created_at,
                       a.account_type
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE a.user_id = $1
            `;
            const values = [userId];
            let paramIndex = 2;

            // Add filters
            if (request.query.account_id) {
                // Verify the account belongs to the user
                query += ` AND t.account_id = $${paramIndex}`;
                values.push(request.query.account_id);
                paramIndex++;
            }

            if (request.query.type) {
                query += ` AND t.type = $${paramIndex}`;
                values.push(request.query.type);
                paramIndex++;
            }

            if (request.query.start_date) {
                query += ` AND t.created_at >= $${paramIndex}`;
                values.push(request.query.start_date);
                paramIndex++;
            }

            if (request.query.end_date) {
                query += ` AND t.created_at <= $${paramIndex}`;
                values.push(request.query.end_date);
                paramIndex++;
            }

            query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(parseInt(request.query.limit) || 50);
            values.push(parseInt(request.query.offset) || 0);

            const result = await fastify.pg.query(query, values);
            return reply.send(result.rows);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // GET /transactions/:id - Get specific transaction by ID
    fastify.get('/transactions/:id', {
        schema: {
            tags: ['transactions'],
            summary: 'Get a specific transaction by ID',
            description: 'Returns a single transaction by their ID. Must belong to an account owned by the authenticated user.',
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
                    description: 'Successful response with transaction data',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        account_id: { type: 'string', format: 'uuid' },
                        destination_account_id: { type: ['string', 'null'], format: 'uuid' },
                        account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                        type: { type: 'string', enum: ['deposit', 'withdrawal', 'transfer'] },
                        amount: { type: 'string', pattern: '\\d+\\.\\d{2}' },
                        description: { type: ['string', 'null'] },
                        idempotency_key: { type: 'string', format: 'uuid' },
                        created_at: { type: 'string', format: 'date-time' }
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
                    description: 'Forbidden - transaction does not belong to user',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                404: {
                    description: 'Transaction not found',
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
            const result = await fastify.pg.query(`
                SELECT t.id, t.account_id, t.destination_account_id, t.type, t.amount, t.description, t.idempotency_key, t.created_at,
                       a.account_type
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE t.id = $1 AND a.user_id = $2
            `, [id, userId]);

            if (result.rows.length === 0) {
                // Check if transaction exists at all (to differentiate between not found and forbidden)
                const transactionCheck = await fastify.pg.query(
                    'SELECT t.id FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE t.id = $1',
                    [id]
                );

                if (transactionCheck.rows.length === 0) {
                    return reply.status(404).send({ error: 'Transaction not found', details: `No transaction found with id ${id}` });
                } else {
                    return reply.status(403).send({ error: 'Forbidden', details: 'Transaction does not belong to the authenticated user' });
                }
            }

            return reply.send(result.rows[0]);
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // POST /transactions - Create new transaction (deposit or withdrawal only)
    fastify.post('/transactions', {
        schema: {
            tags: ['transactions'],
            summary: 'Create a new transaction (deposit or withdrawal)',
            description: 'Creates a new deposit or withdrawal transaction for an account belonging to the authenticated user. Updates the account balance atomically.',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['account_id', 'type', 'amount'],
                properties: {
                    account_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the account to transact with (must belong to authenticated user)'
                    },
                    type: {
                        type: 'string',
                        enum: ['deposit', 'withdrawal'],
                        description: 'Type of transaction'
                    },
                    amount: {
                        type: 'string',
                        pattern: '\\d+\\.\\d{2}',
                        description: 'Positive amount for the transaction (e.g., "100.00")'
                    },
                    description: {
                        type: ['string', 'null'],
                        description: 'Optional description of the transaction'
                    },
                    idempotency_key: {
                        type: 'string',
                        format: 'uuid',
                        description: 'UUID to ensure idempotency (prevents duplicate transactions)'
                    }
                },
                additionalProperties: false
            },
            response: {
                201: {
                    description: 'Transaction successfully created',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        account_id: { type: 'string', format: 'uuid' },
                        destination_account_id: { type: ['string', 'null'], format: 'uuid' },
                        account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                        type: { type: 'string', enum: ['deposit', 'withdrawal'] },
                        amount: { type: 'string', pattern: '\\d+\\.\\d{2}' },
                        description: { type: ['string', 'null'] },
                        idempotency_key: { type: ['string', 'null'], format: 'uuid' },
                        created_at: { type: 'string', format: 'date-time' }
                    },
                    example: {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "account_id": "123e4567-e89b-12d3-a456-426614174000",
                        "destination_account_id": null,
                        "account_type": "checking",
                        "type": "deposit",
                        "amount": "100.00",
                        "description": "Initial deposit",
                        "idempotency_key": "550e8400-e29b-41d4-a716-446655440001",
                        "created_at": "2023-01-01T12:00:00Z"
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
                403: {
                    description: 'Forbidden - account does not belong to user',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                409: {
                    description: 'Conflict - idempotency key already exists',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    },
                    example: {
                        error: 'Conflict',
                        details: 'Transaction with this idempotency key already exists'
                    }
                }
            }
        }
    }, async (request, reply) => {
        // Verify token
        const verified = await verifyToken(fastify, request, reply);
        if (!verified) return;

        const { account_id, type, amount, description, idempotency_key } = request.body;
        const userId = request.user.sub; // From JWT payload

        // Generate idempotency key if not provided (let database generate default if not provided)
        const finalIdempotencyKey = idempotency_key || randomUUID();

        // Validate amount is positive
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return reply.status(400).send({
                error: 'Invalid amount',
                details: 'Amount must be a positive number'
            });
        }

        try {
            // Start a transaction for atomicity
            await fastify.pg.query('BEGIN');

            try {
                // Verify the account belongs to the user and get current balance and type
                const accountResult = await fastify.pg.query(
                    'SELECT id, balance, account_type FROM accounts WHERE id = $1 AND user_id = $2',
                    [account_id, userId]
                );

                if (accountResult.rows.length === 0) {
                    await fastify.pg.query('ROLLBACK');
                    // Check if account exists at all (to differentiate between not found and forbidden)
                    const accountExists = await fastify.pg.query(
                        'SELECT id FROM accounts WHERE id = $1',
                        [account_id]
                    );

                    if (accountExists.rows.length === 0) {
                        return reply.status(404).send({ error: 'Account not found', details: `No account found with id ${account_id}` });
                    } else {
                        return reply.status(403).send({ error: 'Forbidden', details: 'Account does not belong to the authenticated user' });
                    }
                }

                const account = accountResult.rows[0];
                const currentBalance = parseFloat(account.balance);
                let newBalance;

                // Calculate new balance based on transaction type
                if (type === 'deposit') {
                    newBalance = currentBalance + amountNum;
                } else if (type === 'withdrawal') {
                    newBalance = currentBalance - amountNum;
                    // Check for sufficient balance
                    if (newBalance < 0) {
                        await fastify.pg.query('ROLLBACK');
                        return reply.status(400).send({
                            error: 'Insufficient funds',
                            details: `Account balance insufficient for withdrawal. Current balance: ${currentBalance}, requested: ${amountNum}`
                        });
                    }
                } else {
                    // Should not happen due to schema validation
                    await fastify.pg.query('ROLLBACK');
                    return reply.status(400).send({
                        error: 'Invalid transaction type',
                        details: 'Transaction type must be deposit or withdrawal'
                    });
                }

                // Check idempotency key for duplicates (only if provided in request)
                if (idempotency_key) {
                    const existingTransaction = await fastify.pg.query(
                        'SELECT id FROM transactions WHERE idempotency_key = $1',
                        [idempotency_key]
                    );

                    if (existingTransaction.rows.length > 0) {
                        await fastify.pg.query('ROLLBACK');
                        return reply.status(409).send({
                            error: 'Idempotency key already exists',
                            details: 'Transaction with this idempotency key already exists'
                        });
                    }
                }

                // Create the transaction and get the returned data
                const transactionResult = await fastify.pg.query(`
                    INSERT INTO transactions (account_id, destination_account_id, type, amount, description, idempotency_key)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id, account_id, destination_account_id, type, amount, description, idempotency_key, created_at
                `, [account_id, null, type, amount, description || null, finalIdempotencyKey]);

                // Update account balance
                await fastify.pg.query(
                    'UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2',
                    [newBalance.toFixed(2), account_id]
                );

                // Commit the transaction
                await fastify.pg.query('COMMIT');

                // Get the transaction with account type
                const transactionWithAccount = await fastify.pg.query(`
                    SELECT t.id, t.account_id, t.destination_account_id, t.type, t.amount, t.description, t.idempotency_key, t.created_at,
                           a.account_type
                    FROM transactions t
                    JOIN accounts a ON t.account_id = a.id
                    WHERE t.id = $1
                `, [transactionResult.rows[0].id]);

                return reply.status(201).send(transactionWithAccount.rows[0]);
            } catch (err) {
                // Rollback on any error
                await fastify.pg.query('ROLLBACK');
                throw err;
            }
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });

    // POST /transfers - Create a new transfer between accounts (atomic)
    fastify.post('/transfers', {
        schema: {
            tags: ['transfers'],
            summary: 'Create a new transfer between accounts',
            description: 'Creates an atomic transfer between two accounts (same user or different users). Cannot transfer between accounts of the same type for the same user.',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['source_account_id', 'destination_account_id', 'amount'],
                properties: {
                    source_account_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the source account (will be debited)'
                    },
                    destination_account_id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'ID of the destination account (will be credited)'
                    },
                    amount: {
                        type: 'string',
                        pattern: '\\d+\\.\\d{2}',
                        description: 'Positive amount to transfer (e.g., "50.00")'
                    },
                    description: {
                        type: ['string', 'null'],
                        description: 'Optional description of the transfer'
                    },
                    idempotency_key: {
                        type: 'string',
                        format: 'uuid',
                        description: 'UUID to ensure idempotency (prevents duplicate transfers)'
                    }
                },
                additionalProperties: false
            },
            response: {
                201: {
                    description: 'Transfer successfully created',
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        source_account_id: { type: 'string', format: 'uuid' },
                        destination_account_id: { type: 'string', format: 'uuid' },
                        source_account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                        destination_account_type: { type: 'string', enum: ['checking', 'savings', 'credit'] },
                        type: { type: 'string', enum: ['transfer'] },
                        amount: { type: 'string', pattern: '\\d+\\.\\d{2}' },
                        description: { type: ['string', 'null'] },
                        idempotency_key: { type: ['string', 'null'], format: 'uuid' },
                        created_at: { type: 'string', format: 'date-time' }
                    },
                    example: {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "source_account_id": "11111111-1111-1111-1111-111111111111",
                        "destination_account_id": "22222222-2222-2222-2222-222222222222",
                        "source_account_type": "checking",
                        "destination_account_type": "savings",
                        "type": "transfer",
                        "amount": "50.00",
                        "description": "Transfer to savings",
                        "idempotency_key": "550e8400-e29b-41d4-a716-446655440001",
                        "created_at": "2023-01-01T12:00:00Z"
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
                403: {
                    description: 'Forbidden - account does not belong to user or invalid transfer',
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' }
                    }
                },
                409: {
                    description: 'Conflict - idempotency key already exists',
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

        const { source_account_id, destination_account_id, amount, description, idempotency_key } = request.body;
        const userId = request.user.sub; // From JWT payload

        // Generate idempotency key if not provided
        const finalIdempotencyKey = idempotency_key || randomUUID();

        // Validate amount is positive
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return reply.status(400).send({
                error: 'Invalid amount',
                details: 'Amount must be a positive number'
            });
        }

        // Ensure source and destination are different accounts
        if (source_account_id === destination_account_id) {
            return reply.status(400).send({
                error: 'Invalid transfer',
                details: 'Source and destination accounts must be different'
            });
        }

        try {
            // Start a transaction for atomicity
            await fastify.pg.query('BEGIN');

            try {
                // Verify both accounts belong to the user (if same user) and get their info and types
                // We'll lock both accounts to prevent race conditions
                const accountsResult = await fastify.pg.query(
                    `SELECT id, balance, account_type, user_id
                     FROM accounts
                     WHERE id IN ($1, $2)
                     ORDER BY id  -- ← FIXED: Ensure consistent ordering
                     FOR UPDATE`,
                    [source_account_id, destination_account_id]
                );

                if (accountsResult.rowCount !== 2) {
                    await fastify.pg.query('ROLLBACK');
                    // Determine which account is missing or not owned
                    const sourceExists = await fastify.pg.query(
                        'SELECT id FROM accounts WHERE id = $1',
                        [source_account_id]
                    );
                    const destExists = await fastify.pg.query(
                        'SELECT id FROM accounts WHERE id = $1',
                        [destination_account_id]
                    );

                    if (sourceExists.rowCount === 0) {
                        return reply.status(404).send({ error: 'Source account not found', details: `No account found with id ${source_account_id}` });
                    }
                    if (destExists.rowCount === 0) {
                        return reply.status(404).send({ error: 'Destination account not found', details: `No account found with id ${destination_account_id}` });
                    }

                    // If both exist but not owned by user, check ownership
                    const sourceOwner = await fastify.pg.query(
                        'SELECT user_id FROM accounts WHERE id = $1',
                        [source_account_id]
                    );
                    const destOwner = await fastify.pg.query(
                        'SELECT user_id FROM accounts WHERE id = $1',
                        [destination_account_id]
                    );

                    if (sourceOwner.rows[0].user_id !== userId) {
                        return reply.status(403).send({ error: 'Forbidden', details: 'Source account does not belong to the authenticated user' });
                    }
                    if (destOwner.rows[0].user_id !== userId) {
                        return reply.status(403).send({ error: 'Forbidden', details: 'Destination account does not belong to the authenticated user' });
                    }

                    // Fallback (should not happen)
                    return reply.status(400).send({ error: 'Invalid accounts' });
                }

                // ✅ FIXED: Properly identify accounts by ID (not array position)
                const sourceAcc = accountsResult.rows.find(acc => acc.id === source_account_id);
                const destAcc = accountsResult.rows.find(acc => acc.id === destination_account_id);

                // Safety check
                if (!sourceAcc || !destAcc) {
                    await fastify.pg.query('ROLLBACK');
                    return reply.status(400).send({
                        error: 'Internal error',
                        details: 'Failed to identify accounts properly'
                    });
                }

                // If both accounts belong to the same user, enforce different account types
                if (sourceAcc.user_id === userId && destAcc.user_id === userId) {
                    if (sourceAcc.account_type === destAcc.account_type) {
                        await fastify.pg.query('ROLLBACK');
                        return reply.status(400).send({
                            error: 'Invalid transfer',
                            details: `Cannot transfer between accounts of the same type (${sourceAcc.account_type}) for the same user`
                        });
                    }
                }
                // If accounts belong to different users, any type combination is allowed

                const sourceBalance = parseFloat(sourceAcc.balance);
                const destBalance = parseFloat(destAcc.balance);

                // Check sufficient funds in source account
                if (sourceBalance < amountNum) {
                    await fastify.pg.query('ROLLBACK');
                    return reply.status(400).send({
                        error: 'Insufficient funds',
                        details: `Source account balance ${sourceBalance} < requested ${amountNum}`
                    });
                }

                // Check idempotency key for duplicates (only if provided in request)
                if (idempotency_key) {
                    const existingTransfer = await fastify.pg.query(
                        'SELECT id FROM transactions WHERE idempotency_key = $1',
                        [idempotency_key]
                    );

                    if (existingTransfer.rows.length > 0) {
                        await fastify.pg.query('ROLLBACK');
                        return reply.status(409).send({
                            error: 'Idempotency key already exists',
                            details: 'Transfer with this idempotency key already exists'
                        });
                    }
                }

                // Create the transfer record
                const transferResult = await fastify.pg.query(
                    `INSERT INTO transactions
                         (account_id, destination_account_id, type, amount, description, idempotency_key)
                     VALUES ($1, $2, 'transfer', $3, $4, $5)
                     RETURNING id, account_id, destination_account_id, type, amount, description, idempotency_key, created_at`,
                    [source_account_id, destination_account_id, amount, description || null, finalIdempotencyKey]
                );

                // Update balances: source -= amount, destination += amount
                const newSourceBalance = (sourceBalance - amountNum).toFixed(2);
                const newDestBalance = (destBalance + amountNum).toFixed(2);
                await fastify.pg.query(
                    'UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2',
                    [newSourceBalance, source_account_id]
                );
                await fastify.pg.query(
                    'UPDATE accounts SET balance = $1, updated_at = now() WHERE id = $2',
                    [newDestBalance, destination_account_id]
                );

                // Commit the transaction
                await fastify.pg.query('COMMIT');

                // Fetch the transfer with account types for both accounts
                const transferWithAccount = await fastify.pg.query(
                    `SELECT t.id,
                            t.account_id AS source_account_id,
                            t.destination_account_id,
                            t.type,
                            t.amount,
                            t.description,
                            t.idempotency_key,
                            t.created_at,
                            sa.account_type AS source_account_type,
                            da.account_type AS destination_account_type
                     FROM transactions t
                     JOIN accounts sa ON t.account_id = sa.id
                     JOIN accounts da ON t.destination_account_id = da.id
                     WHERE t.id = $1`,
                    [transferResult.rows[0].id]
                );

                return reply.status(201).send(transferWithAccount.rows[0]);
            } catch (err) {
                // Rollback on any error
                await fastify.pg.query('ROLLBACK');
                throw err;
            }
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', details: err.message });
        }
    });
}

export default transactionsRoute;