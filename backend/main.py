"""
Mangaflix Prime - ponto de entrada local.
Sobe a API (api_server.py) na porta do .env (PORT; 4000 no desenvolvimento).
Em produção o container usa o entrypoint.sh (uvicorn direto).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "shared" / "python"))

import uvicorn
from config import get_settings


def main():
    settings = get_settings()
    print(f"Iniciando Mangaflix Prime API em http://{settings.HOST}:{settings.PORT} (docs em /docs)")
    uvicorn.run("api_server:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)


if __name__ == "__main__":
    main()
