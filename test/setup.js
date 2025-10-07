/**
 * Jest Test Setup
 * 
 * This file sets up the test environment for COINSCIOUS platform tests.
 * It configures global test utilities, mocks, and environment variables.
 */

import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock ethers for contract tests
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn(),
    Contract: jest.fn(),
    isAddress: jest.fn(),
    keccak256: jest.fn(),
    toUtf8Bytes: jest.fn(),
    formatUnits: jest.fn(),
    parseUnits: jest.fn()
  }
}));

// Mock database connections
jest.mock('pg', () => ({
  Pool: jest.fn(),
  Client: jest.fn()
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Global test utilities
global.testUtils = {
  // Generate random test data
  generateTestAddress: () => `0x${Math.random().toString(16).substring(2, 42)}`,
  
  // Generate random test amount
  generateTestAmount: (min = 1000, max = 100000) => 
    Math.floor(Math.random() * (max - min + 1)) + min,
  
  // Generate random test date
  generateTestDate: (start = new Date('2023-01-01'), end = new Date()) =>
    new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())),
  
  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock contract response
  mockContractResponse: (data) => ({
    getInfo: jest.fn().mockResolvedValue(data),
    owner: jest.fn().mockResolvedValue(data.owner),
    token: jest.fn().mockResolvedValue(data.token),
    name: jest.fn().mockResolvedValue(data.name),
    symbol: jest.fn().mockResolvedValue(data.symbol),
    decimals: jest.fn().mockResolvedValue(data.decimals),
    totalSupply: jest.fn().mockResolvedValue(data.totalSupply)
  })
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
