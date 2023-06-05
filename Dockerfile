FROM node:18-alpine AS base

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

FROM base AS dev

# Set the working directory in the container
WORKDIR /app

# Install app dependencies
RUN npm install

# We expect files to be mounted in /app
# Start the Feathers app
ENTRYPOINT ["npm", "run", "local"]