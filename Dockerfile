# # Stage 1: Build the frontend with Vite
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run setup

# # # STAGE 2: Serve the built frondend with Nginx
# FROM nginx:stable-alpine
# WORKDIR /usr/share/nginx/html
# COPY --from=builder /app/dist .

# EXPOSE 5000
# CMD ["nginx", "-g", "daemon off;"]

# # Stage 3: Backend setup (if needed)
# # FROM node:20-alpine

# # WORKDIR /usr/src/app

# # COPY package*.json ./

# # RUN npm install

# # COPY . .

# # EXPOSE 4000

# # CMD sh -c "npm run dev -- --host 0.0.0.0"