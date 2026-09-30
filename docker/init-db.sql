CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"account_type" text NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_user_id_account_type_key" UNIQUE("user_id","account_type"),
	CONSTRAINT "accounts_account_type_check" CHECK ((account_type = ANY (ARRAY['checking'::text, 'savings'::text, 'credit'::text]))),
	CONSTRAINT "accounts_balance_check" CHECK ((balance >= (0)::numeric))
);
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"destination_account_id" uuid,
	"type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"idempotency_key" uuid NOT NULL CONSTRAINT "uq_transactions_idempotency_key" UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_amount_positive" CHECK ((amount > (0)::numeric)),
	CONSTRAINT "chk_destination_account" CHECK ((((type = 'transfer'::text) AND (destination_account_id IS NOT NULL)) OR ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text])) AND (destination_account_id IS NULL)))),
	CONSTRAINT "chk_transaction_type" CHECK ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'transfer'::text])))
);
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"username" text NOT NULL CONSTRAINT "users_username_key" UNIQUE,
	"email" text NOT NULL CONSTRAINT "users_email_key" UNIQUE,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "accounts_pkey" ON "accounts" ("id");
CREATE UNIQUE INDEX "accounts_user_id_account_type_key" ON "accounts" ("user_id","account_type");
CREATE INDEX "ix_transactions_account_id" ON "transactions" ("account_id");
CREATE INDEX "ix_transactions_created_at" ON "transactions" ("created_at");
CREATE INDEX "ix_transactions_destination_account_id" ON "transactions" ("destination_account_id");
CREATE UNIQUE INDEX "transactions_pkey" ON "transactions" ("id");
CREATE UNIQUE INDEX "uq_transactions_idempotency_key" ON "transactions" ("idempotency_key");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "fk_transactions_destination_account" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;
ALTER TABLE "transactions" ADD CONSTRAINT "fk_transactions_source_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL;