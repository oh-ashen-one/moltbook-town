# Claude Instructions for Moltbook Town

## Deployment

**IMPORTANT**: After every `git push`, you MUST also run:
```bash
npm run party:deploy
```

This deploys the PartyKit server (chat, phone calls, etc). Git push only updates the frontend - the backend requires a separate PartyKit deploy.

## Architecture
- Frontend: Vite + Phaser (deploys via git push)
- Backend: PartyKit (requires `npm run party:deploy`)
