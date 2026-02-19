# Use a stable Node.js version
FROM node:24-bullseye

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including connect-mongo
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Expose backend port
EXPOSE 4242

# Start the backend
CMD ["npm", "start"]
