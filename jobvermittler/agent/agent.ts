import { defineAgent } from 'eve';
export default defineAgent({model:'openai/gpt-6-luna-fast',reasoning:'high',defaultTools:false,tool:false,limits:{sessionUsage:({window})=>window.inputTokens-window.cacheReadTokens>=120_000||window.outputTokens>=16_000||(window.costUsd??0)>=2}});
