# --- STAGE 1: Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Salin package manifesto untuk instalasi dependensi
COPY package*.json ./
RUN npm install

# Salin seluruh kode sumber
COPY . .

# Build aplikasi (Frontend Vite & Backend Server Bundle)
# Menghasilkan direktori /dist
RUN npm run build

# --- STAGE 2: Run Stage ---
FROM node:20-alpine AS runner

WORKDIR /app
NODE_ENV=production

# Salin hanya hasil build dari stage sebelumnya
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Instal hanya dependensi produksi untuk menghemat ruang
RUN npm install --only=production

# Dedikasikan user non-root untuk keamanan kontainer
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Ekspos port aplikasi LanPro
EXPOSE 3000

# Jalankan server LanPro v1.4
CMD ["npm", "start"]
