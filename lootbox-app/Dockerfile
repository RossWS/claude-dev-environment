# Use the official Node.js 18 runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Create database directory and set permissions
RUN mkdir -p database && chown -R node:node database

# Create uploads directory for future file uploads
RUN mkdir -p uploads && chown -R node:node uploads

# Switch to non-root user for security
USER node

# Expose the port the app runs on
EXPOSE 5000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/utils/health-check.js || exit 1

# Define the command to run the application
CMD ["npm", "start"]