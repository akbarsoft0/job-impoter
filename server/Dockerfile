FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies required for building native modules (if any)
RUN apk add --no-cache python3 make g++


# --------------------------------------------------
# Stage 1: Install dependencies & build the project
# --------------------------------------------------
FROM base AS builder

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev) needed for building
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript -> dist/
RUN npm run build


# --------------------------------------------------
# Stage 2: Production Image
# --------------------------------------------------
FROM node:18-alpine AS production
WORKDIR /app

# Only copy package files again
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start app
CMD ["npm", "start"]
