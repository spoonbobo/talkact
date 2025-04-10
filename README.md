# onlysaid

onlysaid (光說不做) is a go-to chatroom application for you to collaborate with your team and AI agents, integrated with human-in-the-loop planning system, knowledge base, and MCP protocols.
onlysaid is under rapid development, welcome to contribute.

![alt text](./public/demo_plan.png)

## Features

- All-in-one MCP stack with highly configurable and extensible client & servers
- Intelligent planning system based on chatroom's context
- Planning management with MCP tool executions
- Global AI assistant with a growing knowledge base integrated
- Support multiple languages, Chinese, English, Japanese, Korean, and more to come

## Setup

Environment setting:

```bash
cp config/.env.template .env

# in .env
OPENAI_API_KEY=<YOUR-API-Key>
OPENAI_API_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
```

```bash
docker compose up

docker exec -it onlysaid-ollama bash
ollama pull nomic-embed-text

```

Visit `onlysaid-dev.com` to open the web application.
