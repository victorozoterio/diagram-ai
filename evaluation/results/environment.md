# Ambiente experimental

| Componente | Configuração observada |
|---|---|
| Modelo | `qwen2.5:7b-instruct` |
| Runtime | Ollama `0.33.3` |
| Identificador local | `845dbda0ea48` |
| Plataforma | macOS arm64, Apple M4, 16 GiB de RAM |
| Node.js / pnpm | `v24.19.0` / `11.7.0` |
| Temperatura | `0` |
| Contexto / limite de geração | `4096` / `1536` tokens |
| Repeat penalty / keep alive / timeout | `1.05` / `10m` / `120 s` |

Novas reproduções devem registrar modelo, parâmetros e condições locais. O piloto interrompido antes de receber resposta do modelo está em [pilot/S01-sandbox-denied.json](pilot/S01-sandbox-denied.json) e não integra as 30 execuções.
