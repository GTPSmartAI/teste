// Endereço do backend. No navegador de desenvolvimento é o localhost; no site e no APK vem de VITE_API_URL
// (frontend/.env.production, frontend/.env.android e o deploy.ps1 definem https://back-api-teste.iagtp.com.br).
export const BACKEND_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
