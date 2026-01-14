
FROM node:20-bullseye

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
# Instalar dependencias 
RUN npm ci

# Copiar el resto del código
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Comando para desarrollo
CMD ["npm", "run", "dev", "--", "--host"]
