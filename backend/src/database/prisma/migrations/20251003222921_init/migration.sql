-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "api_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "chains" INTEGER[],
    "decimals" INTEGER NOT NULL DEFAULT 82,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "tx_hash" VARCHAR(66) NOT NULL,
    "log_index" INTEGER NOT NULL,
    "block_number" BIGINT NOT NULL,
    "block_hash" VARCHAR(66) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "from_address" VARCHAR(42) NOT NULL,
    "to_address" VARCHAR(42) NOT NULL,
    "amount" BIGINT NOT NULL,
    "contract_id" UUID NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "gas_price" BIGINT,
    "gas_used" BIGINT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_state" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,
    "last_processed_block" BIGINT NOT NULL,
    "current_block" BIGINT NOT NULL,
    "start_block" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'stopped',
    "is_catching_up" BOOLEAN NOT NULL DEFAULT false,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_error_at" TIMESTAMP(3),
    "blocks_per_second" DOUBLE PRECISION DEFAULT 0,
    "transfers_indexed" BIGINT NOT NULL DEFAULT 0,
    "last_indexed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexer_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reorgs" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "detected_at_block" BIGINT NOT NULL,
    "reorg_depth" INTEGER NOT NULL,
    "old_block_hash" VARCHAR(66) NOT NULL,
    "new_block_hash" VARCHAR(66) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'detected',
    "transfers_affected" INTEGER NOT NULL DEFAULT 0,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reorgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_metadata" (
    "id" UUID NOT NULL,
    "job_id" VARCHAR(255) NOT NULL,
    "job_type" VARCHAR(50) NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "from_block" BIGINT NOT NULL,
    "to_block" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_subscriptions" (
    "id" UUID NOT NULL,
    "wallet_address" VARCHAR(42) NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_receive" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_send" BOOLEAN NOT NULL DEFAULT true,
    "min_amount" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");

-- CreateIndex
CREATE INDEX "contracts_address_idx" ON "contracts"("address");

-- CreateIndex
CREATE INDEX "contracts_active_idx" ON "contracts"("active");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_address_chains_key" ON "contracts"("address", "chains");

-- CreateIndex
CREATE INDEX "transfers_block_number_idx" ON "transfers"("block_number");

-- CreateIndex
CREATE INDEX "transfers_from_address_idx" ON "transfers"("from_address");

-- CreateIndex
CREATE INDEX "transfers_to_address_idx" ON "transfers"("to_address");

-- CreateIndex
CREATE INDEX "transfers_contract_address_idx" ON "transfers"("contract_address");

-- CreateIndex
CREATE INDEX "transfers_timestamp_idx" ON "transfers"("timestamp");

-- CreateIndex
CREATE INDEX "transfers_chain_id_idx" ON "transfers"("chain_id");

-- CreateIndex
CREATE INDEX "transfers_is_confirmed_idx" ON "transfers"("is_confirmed");

-- CreateIndex
CREATE INDEX "transfers_from_address_timestamp_idx" ON "transfers"("from_address", "timestamp");

-- CreateIndex
CREATE INDEX "transfers_to_address_timestamp_idx" ON "transfers"("to_address", "timestamp");

-- CreateIndex
CREATE INDEX "transfers_contract_address_block_number_idx" ON "transfers"("contract_address", "block_number");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_tx_hash_log_index_chain_id_key" ON "transfers"("tx_hash", "log_index", "chain_id");

-- CreateIndex
CREATE INDEX "indexer_state_status_idx" ON "indexer_state"("status");

-- CreateIndex
CREATE INDEX "indexer_state_chain_id_idx" ON "indexer_state"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "indexer_state_chain_id_contract_address_key" ON "indexer_state"("chain_id", "contract_address");

-- CreateIndex
CREATE INDEX "reorgs_chain_id_idx" ON "reorgs"("chain_id");

-- CreateIndex
CREATE INDEX "reorgs_detected_at_block_idx" ON "reorgs"("detected_at_block");

-- CreateIndex
CREATE INDEX "reorgs_status_idx" ON "reorgs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_metadata_job_id_key" ON "job_metadata"("job_id");

-- CreateIndex
CREATE INDEX "job_metadata_job_type_idx" ON "job_metadata"("job_type");

-- CreateIndex
CREATE INDEX "job_metadata_status_idx" ON "job_metadata"("status");

-- CreateIndex
CREATE INDEX "job_metadata_chain_id_idx" ON "job_metadata"("chain_id");

-- CreateIndex
CREATE INDEX "job_metadata_from_block_to_block_idx" ON "job_metadata"("from_block", "to_block");

-- CreateIndex
CREATE INDEX "wallet_subscriptions_wallet_address_idx" ON "wallet_subscriptions"("wallet_address");

-- CreateIndex
CREATE INDEX "wallet_subscriptions_active_idx" ON "wallet_subscriptions"("active");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_subscriptions_wallet_address_chain_id_key" ON "wallet_subscriptions"("wallet_address", "chain_id");

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
