# App Android (APK)

Última atualização: 05/10/2026

- O app é o mesmo site empacotado com Capacitor (`frontend/android`, pacote `com.gtpsmart.mangaflix`). Toda mudança no frontend precisa de APK novo.
- Gerar: `powershell -ExecutionPolicy Bypass -File deploy\build-apk.ps1` (debug) ou `-Release` (assinado). O APK sai na pasta `apk\` (fora do Git). O `deploy.ps1` já gera um APK no fim, a não ser com `-NoApk`.
- Requisitos: JDK 21 em `%LOCALAPPDATA%\AndroidBuild\jdk21` e Android SDK em `%LOCALAPPDATA%\Android\Sdk`. O script mapeia o frontend numa unidade temporária (`Z:`) porque o caminho do projeto tem espaços.
- O APK chama a API em `https://back-api-teste.iagtp.com.br` (`frontend/.env.android`). A origem do app (`https://localhost`) está liberada no CORS do backend.
