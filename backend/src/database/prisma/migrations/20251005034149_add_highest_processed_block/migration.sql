/*
  Warnings:

  - Added the required column `highest_processed_block` to the `indexer_state` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "indexer_state" ADD COLUMN     "highest_processed_block" BIGINT NOT NULL;
