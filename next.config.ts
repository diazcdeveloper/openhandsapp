import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Eliminamos output: 'export'. 
  // Esto activa el modo "Servidor" (Node.js) necesario para Auth y Server Actions.
  
  // 2. Configuración de imágenes.
  // Activamos la optimización nativa de Vercel y permitimos el dominio de Supabase.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Permite cargar imágenes desde tu Supabase Storage
      },
    ],
  },
  
  // 3. (Opcional) Si usas funciones experimentales de Server Actions en versiones viejas
  // experimental: {
  //   serverActions: true, 
  // },
};

export default nextConfig;

