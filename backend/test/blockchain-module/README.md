# Blockchain Module Test Suite

This directory contains comprehensive tests for the blockchain module, ensuring all strategies, services, and utilities work correctly and handle edge cases properly.

## Test Structure

### Core Test Files

- **`abstract-blockchain.strategy.spec.ts`** - Tests for the base blockchain strategy class
- **`viem.strategy.spec.ts`** - Comprehensive tests for the Viem blockchain strategy implementation
- **`blockchain.service.spec.ts`** - Tests for the main blockchain service facade
- **`chain.service.spec.ts`** - Tests for the chain service utility
- **`blockchain-config.factory.spec.ts`** - Tests for the blockchain configuration factory

### Test Utilities

- **`test-utils.ts`** - Common test utilities, mocks, and helper functions
- **`test-setup.ts`** - Test setup utilities and environment configuration
- **`index.ts`** - Test exports and module organization

## Test Coverage

### AbstractBlockchainStrategy Tests

- ✅ Constructor and initialization
- ✅ Chain ID management
- ✅ Error handling and retry logic
- ✅ Provider switching logic
- ✅ Retry delay calculations
- ✅ Lifecycle hooks
- ✅ Utility methods

### ViemBlockchainStrategy Tests

- ✅ Initialization and configuration
- ✅ Chain switching
- ✅ Provider switching
- ✅ Public client methods (read operations)
- ✅ Private client methods (write operations)
- ✅ Provider health checking
- ✅ Error handling and retry logic
- ✅ Transaction preparation and sending
- ✅ Gas estimation and fee calculation
- ✅ Token balance and info retrieval

### BlockchainService Tests

- ✅ Service initialization
- ✅ Strategy switching
- ✅ Public client method delegation
- ✅ Private client method delegation
- ✅ Chain utility method delegation
- ✅ Provider utility methods
- ✅ Health checking
- ✅ Configuration validation

### ChainService Tests

- ✅ Supported chain management
- ✅ Chain information retrieval
- ✅ Viem chain object creation
- ✅ Explorer URL generation
- ✅ Currency information
- ✅ Performance and concurrency
- ✅ Error handling

### BlockchainConfigFactory Tests

- ✅ Strategy creation
- ✅ Configuration loading
- ✅ Provider validation
- ✅ Environment variable handling
- ✅ Error handling
- ✅ Performance testing

## Running Tests

### Run All Blockchain Tests

```bash
npm test -- --testPathPattern=blockchain
```

### Run Specific Test Files

```bash
# Test abstract strategy
npm test -- abstract-blockchain.strategy.spec.ts

# Test Viem strategy
npm test -- viem.strategy.spec.ts

# Test blockchain service
npm test -- blockchain.service.spec.ts

# Test chain service
npm test -- chain.service.spec.ts

# Test config factory
npm test -- blockchain-config.factory.spec.ts
```

### Run Tests with Coverage

```bash
npm test -- --coverage --testPathPattern=blockchain
```

## Test Utilities

### BlockchainTestUtils

Provides common test utilities including:

- Mock ConfigService creation
- Mock ChainService creation
- Mock blockchain configurations
- Mock Viem client responses
- Mock addresses and transaction data
- Error creation helpers

### BlockchainTestSetup

Provides test setup utilities including:

- Complete testing module creation
- Environment variable setup
- Mock configuration creation
- Error response creation
- Promise utilities for async testing

## Mock Strategy

The tests use a comprehensive mock strategy implementation that:

- Implements all required interfaces
- Provides predictable responses
- Allows for easy testing of error scenarios
- Supports both public and private client operations

## Error Testing

The test suite includes comprehensive error testing for:

- Network errors and timeouts
- Rate limiting scenarios
- Server errors (5xx)
- Client errors (4xx)
- RPC errors
- Provider switching scenarios
- Retry logic validation

## Performance Testing

Performance tests ensure:

- Efficient strategy creation
- Fast configuration loading
- Quick validation operations
- Proper handling of concurrent requests

## Best Practices

1. **Isolation**: Each test is isolated and doesn't depend on others
2. **Mocking**: External dependencies are properly mocked
3. **Error Scenarios**: Both success and failure paths are tested
4. **Edge Cases**: Boundary conditions and edge cases are covered
5. **Performance**: Critical paths are performance tested
6. **Documentation**: Tests serve as living documentation

## Adding New Tests

When adding new tests:

1. Follow the existing naming conventions
2. Use the provided test utilities
3. Mock external dependencies
4. Test both success and failure scenarios
5. Include performance tests for critical paths
6. Update this README with new test coverage

## Troubleshooting

### Common Issues

1. **Mock Issues**: Ensure all external dependencies are properly mocked
2. **Async Testing**: Use proper async/await patterns and test utilities
3. **Environment Variables**: Use the test setup utilities for consistent environment
4. **Timing Issues**: Use the provided wait utilities for timing-sensitive tests

### Debug Mode

Run tests in debug mode for detailed output:

```bash
npm test -- --verbose --testPathPattern=blockchain
```

