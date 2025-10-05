# Graceful Shutdown Implementation

This document describes the graceful shutdown implementation for the USDC Transaction Indexer application.

## Overview

The application now properly handles shutdown signals (SIGTERM, SIGINT) and waits for ongoing processes to complete before exiting. This ensures data consistency and prevents corruption when the application is stopped.

## Components

### 1. Main Application (`main.ts`)

- **Signal Handling**: Listens for SIGTERM and SIGINT signals
- **Graceful Shutdown**: Waits up to 30 seconds (configurable) for processes to complete
- **Timeout Protection**: Forces exit if shutdown takes too long
- **Error Handling**: Properly handles uncaught exceptions and unhandled rejections

### 2. Queue Service (`queue.service.ts`)

- **Queue Closure**: Gracefully closes all BullMQ queues during shutdown
- **Metrics Cleanup**: Clears intervals and timers
- **Error Handling**: Logs errors but doesn't fail shutdown

### 3. Coordinator Service (`coordinator.service.ts`)

- **Indexer Shutdown**: Stops all active indexers
- **Job Completion**: Waits for pending jobs to complete (up to 15 seconds)
- **Resource Cleanup**: Clears intervals and timers
- **Status Updates**: Updates indexer status to 'stopped'

### 4. Docker Configuration (`docker-compose.yml`)

- **Stop Signal**: Uses SIGTERM for graceful shutdown
- **Grace Period**: 35-second timeout for container shutdown
- **Environment**: Configurable shutdown timeout via `SHUTDOWN_TIMEOUT`
