// Global BigInt serializer for JSON.stringify (API responses)
// Converts BigInt to string without prefix since Prisma handles BigInt natively
// Object.defineProperty(BigInt.prototype, 'toJSON', {
//   get() {
//     'use strict';
//     return () => String(this);
//   },
// });
