# Alternativas de Deployment para Aplicaciones con Bundles Grandes

## Problema
Vercel tiene límites de tamaño de archivo (50MB por archivo, 100MB total) que pueden causar problemas con aplicaciones que incluyen librerías grandes como:
- Barretenberg (ZK proofs) - ~6.8MB
- Mapbox - ~1.7MB
- React vendor - ~2.9MB

## Alternativas Recomendadas

### 1. **Netlify** ⭐ (Recomendado)
- **Límites**: 100MB por archivo, 500MB total
- **Ventajas**:
  - Deploy automático desde Git
  - CDN global
  - Plan gratuito generoso
  - Soporta funciones serverless
  - Muy fácil de usar
- **Desventajas**: Límite de 100 builds/mes en plan gratuito
- **Precio**: Gratis (con límites), $19/mes (Pro)
- **Link**: https://www.netlify.com/

### 2. **Render**
- **Límites**: 100MB por archivo, sin límite total claro
- **Ventajas**:
  - Deploy automático desde Git
  - Plan gratuito disponible
  - Soporta aplicaciones full-stack
  - Auto-sleep en plan gratuito (se despierta con tráfico)
- **Desventajas**: Auto-sleep puede causar latencia en primera carga
- **Precio**: Gratis (con auto-sleep), $7/mes (Starter)
- **Link**: https://render.com/

### 3. **Cloudflare Pages** ⭐ (Excelente para CDN)
- **Límites**: 25MB por archivo, 500MB total
- **Ventajas**:
  - CDN global muy rápido
  - Deploy automático desde Git
  - Plan gratuito ilimitado
  - Excelente para aplicaciones estáticas
- **Desventajas**: Límite de 25MB por archivo (puede ser un problema con barretenberg)
- **Precio**: Gratis
- **Link**: https://pages.cloudflare.com/

### 4. **DigitalOcean App Platform**
- **Límites**: Sin límites específicos publicados
- **Ventajas**:
  - Deploy automático desde Git
  - Soporta aplicaciones full-stack
  - Plan gratuito para static sites
- **Desventajas**: Menos conocido, documentación menos completa
- **Precio**: Gratis (static sites), $5/mes (Basic)
- **Link**: https://www.digitalocean.com/products/app-platform

### 5. **GitHub Pages** (Solo para sitios estáticos)
- **Límites**: 100MB por archivo, 1GB total
- **Ventajas**:
  - Gratis
  - Integrado con GitHub
  - CDN global
- **Desventajas**: Solo para sitios estáticos, sin funciones serverless
- **Precio**: Gratis
- **Link**: https://pages.github.com/

### 6. **Fly.io**
- **Límites**: Sin límites específicos
- **Ventajas**:
  - Deploy global en edge
  - Soporta Docker
  - Plan gratuito generoso
- **Desventajas**: Más complejo de configurar
- **Precio**: Gratis (con límites), pay-as-you-go
- **Link**: https://fly.io/

## Recomendación Final

Para tu aplicación, recomiendo **Netlify** porque:
1. ✅ Soporta archivos de hasta 100MB (suficiente para barretenberg)
2. ✅ CDN global rápido
3. ✅ Deploy automático desde Git
4. ✅ Plan gratuito generoso
5. ✅ Muy fácil de configurar

### Pasos para deploy en Netlify:

1. **Instalar Netlify CLI** (opcional):
```bash
npm install -g netlify-cli
```

2. **Build del proyecto**:
```bash
npm run build
```

3. **Deploy**:
   - Opción A: Arrastra la carpeta `dist` a https://app.netlify.com/drop
   - Opción B: Conecta tu repositorio Git en Netlify dashboard
   - Opción C: Usa CLI: `netlify deploy --prod --dir=dist`

4. **Configurar variables de entorno** en Netlify dashboard si es necesario

## Optimizaciones Adicionales

Para reducir el tamaño de los bundles:
1. ✅ Lazy loading de páginas pesadas (ya implementado)
2. ✅ Code splitting con manual chunks (ya implementado)
3. ⚠️ Considera usar CDN para librerías grandes (barretenberg, mapbox)
4. ⚠️ Implementa service workers para cache

