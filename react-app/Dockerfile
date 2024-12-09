# Step 1: Use a Node.js base image to build the React app
FROM node:16 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the React app and run the development server
COPY . .

# Expose port 3000 for React development server
EXPOSE 3000

# Command to start the React app in development mode
CMD ["npm", "start"]
