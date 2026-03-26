// backend/src/index.ts

import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3001;

console.log(`Collabwave backend starting on port ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
