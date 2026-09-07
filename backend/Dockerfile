FROM node:20
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for tsx)
RUN npm install

# Copy source code
COPY . .

# Create directories for volumes
RUN mkdir -p /app/data /app/uploads

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

# Run with tsx directly (same as local dev, no build step needed)
CMD ["node", "node_modules/tsx/dist/cli.mjs", "index.ts"]
